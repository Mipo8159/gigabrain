import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeClock } from './_clock.ts';
import { deliverWebhook } from '../src/deliver.ts';

type Reply = { status: number; headers?: Record<string, string> | (() => Record<string, string>) };

function fakePartner(t: any, clock: ReturnType<typeof fakeClock>, replies: Reply[]) {
  const calls: number[] = [];
  t.mock.method(globalThis, 'fetch', async () => {
    const r = replies[Math.min(calls.length, replies.length - 1)];
    calls.push(clock.now());
    const headers = typeof r.headers === 'function' ? r.headers() : r.headers;
    return new Response(r.status === 204 ? null : 'x', { status: r.status, headers });
  });
  return calls;
}

test('honours Retry-After given as an HTTP-date', async (t) => {
  const clock = fakeClock(t);
  // computed when the 503 is sent: "come back in 7 s", as an IMF-fixdate
  const calls = fakePartner(t, clock, [
    { status: 503, headers: () => ({ 'retry-after': new Date(Date.now() + 7000).toUTCString() }) },
    { status: 204 },
  ]);
  const s = clock.track(deliverWebhook('https://partner.example/hook', { id: 'evt_1' }));
  await clock.runUntil(s, 30_000);
  assert.ok(s.settled && !s.error, `expected delivery to succeed, got ${s.error}`);
  assert.equal(calls.length, 2);
  assert.ok(calls[1] >= 7000, `retried ${calls[1]} ms after a 503 that said to come back in 7 s`);
  assert.ok(calls[1] <= 9000, `waited ${calls[1]} ms; Retry-After asked for 7 s`);
});

test('honours Retry-After given in seconds', async (t) => {
  const clock = fakeClock(t);
  const calls = fakePartner(t, clock, [{ status: 429, headers: { 'retry-after': '3' } }, { status: 200 }]);
  const s = clock.track(deliverWebhook('https://partner.example/hook', { id: 'evt_2' }));
  await clock.runUntil(s, 30_000);
  assert.ok(s.settled && !s.error, `expected delivery to succeed, got ${s.error}`);
  assert.equal(calls.length, 2);
  assert.ok(calls[1] >= 3000 && calls[1] <= 5000, `retried at ${calls[1]} ms, Retry-After said 3 s`);
});

test('a Retry-After longer than the job lease: no early retry, and no overrunning the lease', async (t) => {
  const clock = fakeClock(t);
  const calls = fakePartner(t, clock, [{ status: 503, headers: { 'retry-after': '120' } }]);
  const s = clock.track(deliverWebhook('https://partner.example/hook', { id: 'evt_3' }));
  await clock.runUntil(s, 200_000);
  assert.ok(s.settled && s.error, 'must throw so the job is re-queued');
  assert.ok(s.at <= 30_000, `threw after ${s.at} ms; the job lease is 30 s`);
  assert.equal(calls.length, 1, `called the partner again at ${calls.slice(1).join(', ')} ms despite Retry-After: 120`);
});

test('permanent errors are not retried', async (t) => {
  const clock = fakeClock(t);
  const calls = fakePartner(t, clock, [{ status: 400 }, { status: 204 }]);
  const s = clock.track(deliverWebhook('https://partner.example/hook', { id: 'evt_4' }));
  await clock.runUntil(s, 30_000);
  assert.ok(s.settled && s.error);
  assert.equal(calls.length, 1);
});
