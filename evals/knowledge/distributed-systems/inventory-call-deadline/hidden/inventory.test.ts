import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeClock } from './_clock.ts';
import { getStock } from '../src/inventory.ts';

type Step = { status?: number; after: number } | 'hang' | 'reset';

// Fake inventory: each call follows the next step (the last step repeats). Honours the request's AbortSignal.
function fakeInventory(t: any, clock: ReturnType<typeof fakeClock>, steps: Step[]) {
  const calls: number[] = [];
  t.mock.method(globalThis, 'fetch', (url: string, init: RequestInit = {}) => {
    const step = steps[Math.min(calls.length, steps.length - 1)];
    calls.push(clock.now());
    const signal = init.signal;
    return new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(signal.reason);
      signal?.addEventListener('abort', () => reject(signal.reason), { once: true });
      if (step === 'hang') return;
      if (step === 'reset') return reject(new TypeError('fetch failed', { cause: Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' }) }));
      setTimeout(() => {
        const sku = decodeURIComponent(String(url).split('/').pop()!);
        const status = step.status ?? 200;
        resolve(new Response(status === 200 ? JSON.stringify({ sku, available: 5 }) : 'unavailable',
          { status, headers: { 'content-type': status === 200 ? 'application/json' : 'text/plain' } }));
      }, step.after);
    });
  });
  return calls;
}

test('a slow-but-valid answer is accepted', async (t) => {
  const clock = fakeClock(t);
  fakeInventory(t, clock, [{ status: 200, after: 1500 }]);
  const s = clock.track(getStock('SKU-1'));
  await clock.runUntil(s, 5000);
  assert.ok(s.settled && !s.error, `expected success, got ${s.error}`);
  assert.equal((s.value as any).available, 5);
});

test('retries a transient failure and succeeds', async (t) => {
  const clock = fakeClock(t);
  const calls = fakeInventory(t, clock, ['reset', { status: 503, after: 20 }, { status: 200, after: 50 }]);
  const s = clock.track(getStock('SKU-2'));
  await clock.runUntil(s, 5000);
  assert.ok(s.settled && !s.error, `expected success, got ${s.error}`);
  assert.equal(calls.length, 3);
});

test('a slow failing dependency cannot hold checkout past 2 s', async (t) => {
  const clock = fakeClock(t);
  const calls = fakeInventory(t, clock, [{ status: 503, after: 900 }]);
  const s = clock.track(getStock('SKU-3'));
  await clock.runUntil(s, 10_000);
  assert.ok(s.settled && s.error, 'getStock must reject when inventory keeps failing');
  assert.ok(s.at <= 2100, `getStock settled after ${s.at} ms; checkout has 2 s for this call in total`);
  assert.ok(calls.length <= 3);
});

test('a hanging dependency cannot hold checkout past 2 s', async (t) => {
  const clock = fakeClock(t);
  fakeInventory(t, clock, ['hang']);
  const s = clock.track(getStock('SKU-4'));
  await clock.runUntil(s, 10_000);
  assert.ok(s.settled && s.error, 'getStock must reject when inventory never answers');
  assert.ok(s.at <= 2100, `getStock settled after ${s.at} ms; checkout has 2 s for this call in total`);
});

test('stops at once, and stops retrying, when checkout aborts', async (t) => {
  const clock = fakeClock(t);
  const calls = fakeInventory(t, clock, [{ status: 503, after: 250 }, 'hang']);
  const ac = new AbortController();
  const s = clock.track(getStock('SKU-5', { signal: ac.signal }));
  await clock.advance(300); // first attempt failed with 503, now backing off or on attempt 2
  const before = calls.length;
  ac.abort();
  await clock.runUntil(s, 100);
  assert.ok(s.settled && s.error, 'getStock must reject promptly after the caller aborts');
  await clock.advance(3000);
  assert.equal(calls.length, before, 'no new attempts after the caller aborted');
});
