import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeClock } from './_clock.ts';
import { CircuitBreaker } from '../src/breaker.ts';
import { HttpError } from '../src/http.ts';

const opts = { failureThreshold: 5, resetTimeoutMs: 10_000, timeoutMs: 2_000 };

async function trip(clock: ReturnType<typeof fakeClock>, b: CircuitBreaker) {
  for (let i = 0; i < 5; i++) {
    const s = clock.track(b.call(async () => { throw new HttpError(503); }));
    await clock.runUntil(s, 100);
  }
}

test('bad SKUs from users do not open the circuit', async (t) => {
  const clock = fakeClock(t);
  const b = new CircuitBreaker(opts);
  for (let i = 0; i < 20; i++) {
    const err = new HttpError(i % 2 ? 404 : 422);
    const s = clock.track(b.call(async () => { throw err; }));
    await clock.runUntil(s, 100);
    assert.equal(s.error, err, 'errors from fn are rethrown unchanged');
  }
  let called = false;
  const s = clock.track(b.call(async () => { called = true; return 42; }));
  await clock.runUntil(s, 100);
  assert.ok(called, 'pricing is healthy; 404/422 are answers about the SKU, not failures of pricing');
  assert.equal(s.value, 42);
});

test('opens after 5 failures and fails fast', async (t) => {
  const clock = fakeClock(t);
  const b = new CircuitBreaker(opts);
  await trip(clock, b);
  let called = false;
  const s = clock.track(b.call(async () => { called = true; return 1; }));
  await clock.runUntil(s, 50);
  assert.ok(s.settled && s.error, 'call must fail fast while open');
  assert.equal(called, false);
});

test('after the reset timeout, a recovering pricing is not hit by the whole backlog', async (t) => {
  const clock = fakeClock(t);
  const b = new CircuitBreaker(opts);
  await trip(clock, b);
  await clock.advance(10_050, 50);

  const pending: ((v: number) => void)[] = [];
  const calls = Array.from({ length: 20 }, () =>
    clock.track(b.call(() => new Promise<number>((resolve) => { pending.push(resolve); }))));
  await clock.flush();
  await clock.advance(20);
  assert.ok(pending.length >= 1, 'pricing must be tried again after resetTimeoutMs');
  assert.ok(pending.length <= 3, `${pending.length} of 20 concurrent calls went to pricing while it was still on probation`);
  const failedFast = calls.filter((c) => c.settled && c.error).length;
  assert.equal(failedFast, 20 - pending.length, 'calls not let through must fail fast, not wait');

  for (const r of pending) r(7); // pricing answers: it has recovered
  await clock.advance(20);
  let called = false;
  const s = clock.track(b.call(async () => { called = true; return 8; }));
  await clock.runUntil(s, 100);
  assert.ok(called && s.value === 8, 'circuit must close after a successful trial call');
});

test('a timed-out call is cancelled, not left running', async (t) => {
  const clock = fakeClock(t);
  const b = new CircuitBreaker(opts);
  let seen: AbortSignal | undefined;
  const s = clock.track(b.call((signal) => { seen = signal; return new Promise(() => {}); }));
  await clock.runUntil(s, 5_000);
  assert.ok(s.settled && s.error, 'call must reject on timeout');
  assert.ok(s.at <= 2_100, `rejected after ${s.at} ms, timeoutMs is 2000`);
  assert.equal(seen?.aborted, true, 'the signal given to fn must be aborted on timeout');
});
