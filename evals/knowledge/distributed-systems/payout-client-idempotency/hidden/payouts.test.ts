import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeClock } from './_clock.ts';
import { createPayout } from '../src/payouts.ts';

type Fault = 'ok' | '503-before' | 'reset-after';

// A payouts API that implements the Idempotency-Key draft: same key + same body replays, same key + other body
// is 422, a retry while the first request is still processing is 409.
function fakePayoutsApi(t: any, opts: { faults?: Fault[]; stillProcessingFor?: number } = {}) {
  const faults = [...(opts.faults ?? [])];
  const payouts: any[] = [];
  const keys = new Map<string, { fp: string; payout: any; processing: number }>();
  const seenKeys: (string | null)[] = [];
  t.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => {
    const key = new Headers(init.headers).get('idempotency-key');
    seenKeys.push(key);
    const fp = String(init.body);
    const body = JSON.parse(fp);
    const json = (status: number, b: unknown) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } });
    if (!(body.amountCents > 0)) return json(422, { error: 'amountCents must be positive' });
    const rec = key ? keys.get(key) : undefined;
    if (rec) {
      if (rec.fp !== fp) return json(422, { error: 'idempotency key reused with a different payload' });
      if (rec.processing > 0) { rec.processing--; return json(409, { error: 'a request with this key is still being processed' }); }
      return json(201, rec.payout);
    }
    const fault = faults.shift() ?? 'ok';
    if (fault === '503-before') return new Response('upstream deploy', { status: 503 });
    const payout = { id: `po_${payouts.length + 1}`, status: 'pending', accountId: body.accountId, amountCents: body.amountCents };
    payouts.push(payout);
    if (key) keys.set(key, { fp, payout, processing: opts.stillProcessingFor ?? 0 });
    if (fault === 'reset-after') throw new TypeError('fetch failed', { cause: Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' }) });
    return json(201, payout);
  });
  return { payouts, seenKeys };
}

const input = { accountId: 'acc_9', amountCents: 2000, currency: 'EUR', reference: 'refund R-1' };

async function run(t: any, p: () => Promise<unknown>) {
  const clock = fakeClock(t);
  const s = clock.track(p());
  await clock.runUntil(s, 10 * 60_000, 50);
  assert.ok(s.settled, 'createPayout never settled');
  return s;
}

test('retries 503s and pays once', async (t) => {
  const api = fakePayoutsApi(t, { faults: ['503-before', '503-before'] });
  const s = await run(t, () => createPayout(input));
  assert.ok(!s.error, `expected success, got ${s.error}`);
  assert.equal(api.payouts.length, 1);
});

test('lost response, then "still processing": the account is paid exactly once', async (t) => {
  // attempt 1 is processed but the connection drops; attempt 2 arrives while it is still being processed
  const api = fakePayoutsApi(t, { faults: ['reset-after'], stillProcessingFor: 1 });
  const s = await run(t, () => createPayout(input));
  assert.equal(api.payouts.length, 1, `account paid ${api.payouts.length} times`);
  assert.ok(!s.error, `expected the payout to be returned, got ${s.error}`);
  assert.equal((s.value as any).id, 'po_1');
});

test('client errors are not retried', async (t) => {
  const api = fakePayoutsApi(t);
  const s = await run(t, () => createPayout({ ...input, amountCents: 0 }));
  assert.ok(s.error, 'expected createPayout to reject');
  assert.equal(api.seenKeys.length, 1, `422 was retried ${api.seenKeys.length - 1} times`);
});

test('two payouts with the same amount are two payouts', async (t) => {
  const api = fakePayoutsApi(t);
  const s = await run(t, async () => [await createPayout(input), await createPayout(input)]);
  assert.ok(!s.error, `expected success, got ${s.error}`);
  assert.equal(api.payouts.length, 2);
});
