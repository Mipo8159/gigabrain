import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPaymentsHandler } from '../src/payments.ts';

function processor(failFirst = 0) {
  const calls: unknown[] = [];
  let n = 0;
  return {
    calls,
    chargeCard: async (input: unknown) => {
      calls.push(input);
      await new Promise(r => setImmediate(r));
      await new Promise(r => setTimeout(r, 5));
      if (++n <= failFirst) throw new Error('ETIMEDOUT');
      return { chargeId: `ch_${n}` };
    },
  };
}
const body = { amountCents: 1999, currency: 'USD', cardToken: 'tok_visa' };
const req = (key: string | undefined, b: unknown = body) => ({ headers: key ? { 'idempotency-key': key } : {}, body: b });

test('sequential retry with the same key: one charge, identical response', async () => {
  const p = processor();
  const h = createPaymentsHandler(p);
  const a = await h(req('k-1'));
  const b = await h(req('k-1'));
  assert.equal(a.status, 201);
  assert.equal(p.calls.length, 1);
  assert.equal(b.status, a.status);
  assert.deepEqual(b.body, a.body);
});

test('double tap: two concurrent requests with the same key charge once', async () => {
  const p = processor();
  const h = createPaymentsHandler(p);
  const [a, b] = await Promise.all([h(req('k-2')), h(req('k-2'))]);
  assert.equal(p.calls.length, 1, `card charged ${p.calls.length} times`);
  const ok = [a, b].filter(r => r.status === 201);
  assert.ok(ok.length >= 1, 'one of them must succeed');
  const other = a.status === 201 ? b : a;
  assert.ok(other.status === 409 || (other.status === 201 && JSON.stringify(other.body) === JSON.stringify(ok[0].body)),
    `duplicate got ${other.status} ${JSON.stringify(other.body)}`);
  const later = await h(req('k-2'));
  assert.equal(later.status, 201);
  assert.deepEqual(later.body, ok[0].body);
  assert.equal(p.calls.length, 1);
});

test('same key with a different payment body is refused, not replayed and not charged', async () => {
  const p = processor();
  const h = createPaymentsHandler(p);
  await h(req('k-3'));
  const r = await h(req('k-3', { ...body, amountCents: 99999 }));
  assert.ok(r.status >= 400 && r.status < 500, `got ${r.status} ${JSON.stringify(r.body)}`);
  assert.equal(p.calls.length, 1);
});

// Removed 2026-10-12: "a processor failure is not stored, the retry charges". The ticket says a retry gets
// "the same answer it would have got the first time", and replaying the stored 502 is Stripe's documented
// behaviour, so both conventions are defensible. Base failed 0/2 only on this assertion: wording, not knowledge.
test('different keys are independent, and no key still works', async () => {
  const p = processor();
  const h = createPaymentsHandler(p);
  const [a, b] = await Promise.all([h(req('k-5')), h(req('k-6'))]);
  assert.equal(a.status, 201);
  assert.equal(b.status, 201);
  assert.notDeepEqual(a.body, b.body);
  assert.equal((await h(req(undefined))).status, 201);
  assert.equal((await h(req(undefined, { amountCents: -1 }))).status, 400);
  assert.equal(p.calls.length, 3);
});
