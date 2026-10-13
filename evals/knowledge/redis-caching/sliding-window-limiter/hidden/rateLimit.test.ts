import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createClient, type RedisClientType } from 'redis';
import { createRateLimiter } from '../src/rateLimit.ts';

const url = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
let a: RedisClientType, b: RedisClientType, admin: RedisClientType;

before(async () => {
  [a, b, admin] = [0, 1, 2].map(() => createClient({ url }) as RedisClientType);
  for (const c of [a, b, admin]) { c.on('error', () => {}); await c.connect(); }
});
after(() => { for (const c of [a, b, admin]) c.destroy(); });
beforeEach(async () => { await admin.flushAll(); });

// The fake clock starts at a real timestamp so Redis-side expiry math stays sane.
function clock() { let t = Date.now(); return { now: () => t, advance: (ms: number) => { t += ms; } }; }
const allowedCount = (rs: boolean[]) => rs.filter(Boolean).length;

test('sequential requests: limit, then blocked, then allowed again after the window', async () => {
  const c = clock();
  const rl = createRateLimiter(a, { limit: 3, windowMs: 1000, now: c.now });
  const rs: boolean[] = [];
  for (let i = 0; i < 5; i++) { rs.push(await rl.allow('k1')); c.advance(10); }
  assert.deepEqual(rs, [true, true, true, false, false]);
  c.advance(1000);
  assert.equal(await rl.allow('k1'), true);
  assert.equal(await rl.allow('other-key'), true, 'keys are independent');
});

test('requests in the same millisecond are all counted', async () => {
  const c = clock();
  const rl = createRateLimiter(a, { limit: 10, windowMs: 1000, now: c.now });
  const rs: boolean[] = [];
  for (let i = 0; i < 20; i++) rs.push(await rl.allow('burst'));
  assert.equal(allowedCount(rs), 10);
});

test('concurrent requests from two instances never exceed the limit', async () => {
  const c = clock();
  const i1 = createRateLimiter(a, { limit: 10, windowMs: 1000, now: c.now });
  const i2 = createRateLimiter(b, { limit: 10, windowMs: 1000, now: c.now });
  const rs = await Promise.all(Array.from({ length: 40 }, (_, i) => { c.advance(1); return (i % 2 ? i1 : i2).allow('conc'); }));
  assert.equal(allowedCount(rs), 10);
});

test('it is a rolling window, not fixed buckets', async () => {
  const c = clock();
  const rl = createRateLimiter(a, { limit: 4, windowMs: 1000, now: c.now });
  c.advance(900);
  for (let i = 0; i < 4; i++) assert.equal(await rl.allow('roll'), true);
  c.advance(200); // a fixed bucket would have reset here; the 4 requests are only 200 ms old
  assert.equal(await rl.allow('roll'), false);
  c.advance(850); // now they are older than the window
  assert.equal(await rl.allow('roll'), true);
});

test('a client retrying while limited gets through once the window has passed', async () => {
  const c = clock();
  const rl = createRateLimiter(a, { limit: 5, windowMs: 1000, now: c.now });
  for (let i = 0; i < 5; i++) assert.equal(await rl.allow('retry'), true);
  for (let i = 0; i < 50; i++) { c.advance(19); assert.equal(await rl.allow('retry'), false); } // tight retry loop for 950 ms
  c.advance(60); // the 5 accepted requests are now older than 1000 ms
  assert.equal(await rl.allow('retry'), true, 'rejected attempts must not keep the client locked out');
});

test('idle keys do not stay in Redis forever', async () => {
  const c = clock();
  const rl = createRateLimiter(a, { limit: 5, windowMs: 1000, now: c.now });
  await rl.allow('idle');
  const keys = await admin.keys('*');
  assert.ok(keys.length > 0);
  for (const k of keys) {
    const pttl = await admin.pTTL(k);
    assert.ok(pttl > 0, `${k} has no expiry (PTTL ${pttl})`);
  }
});
