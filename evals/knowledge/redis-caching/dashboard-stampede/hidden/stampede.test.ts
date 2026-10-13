import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { createClient, type RedisClientType } from 'redis';

// Each production instance is its own process: load a separate copy of the module per simulated instance,
// so nothing in module scope is shared between them (only Redis is).
type GetOrCompute = typeof import('../src/cache.ts').getOrCompute;
let impls: GetOrCompute[];

const url = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
let instances: RedisClientType[];
let admin: RedisClientType;

before(async () => {
  instances = [0, 1, 2].map(() => createClient({ url }) as RedisClientType);
  admin = createClient({ url }) as RedisClientType;
  for (const c of [...instances, admin]) { c.on('error', () => {}); await c.connect(); }
  impls = await Promise.all([0, 1, 2].map(async (i) => (await import(`../src/cache.ts?instance=${i}`)).getOrCompute as GetOrCompute));
});
// instance i = its own module copy + its own connection
const getOrCompute = <T>(i: number, key: string, ttl: number, fn: () => Promise<T>) => impls[i](instances[i], key, ttl, fn);
after(() => { for (const c of [...instances, admin]) c.destroy(); });
beforeEach(async () => { await admin.flushAll(); });

function counted<T>(value: T, ms: number) {
  let calls = 0;
  const fn = async () => { calls++; await sleep(ms); return value; };
  return { fn, get calls() { return calls; } };
}

test('a hot key that is missing is computed once across all instances', async () => {
  const c = counted({ orders: 42, revenueCents: 1234 }, 300);
  const calls = [0, 1, 2].flatMap((i) => Array.from({ length: 15 }, () => getOrCompute(i, 'dash:org1', 300, c.fn)));
  const results = await Promise.all(calls);
  assert.equal(c.calls, 1, `computed ${c.calls} times for 45 concurrent requests on 3 instances`);
  for (const r of results) assert.deepEqual(r, { orders: 42, revenueCents: 1234 });
});

test('cached value is served without recomputing and expires', async () => {
  const c = counted({ n: 1 }, 10);
  assert.deepEqual(await getOrCompute(0, 'dash:org2', 300, c.fn), { n: 1 });
  assert.deepEqual(await getOrCompute(1, 'dash:org2', 300, c.fn), { n: 1 });
  assert.equal(c.calls, 1);
  const pttl = await admin.pTTL('dash:org2');
  assert.ok(pttl > 0 && pttl <= 300_000 * 1.5, `PTTL ${pttl}`);
});

test('different keys do not wait for each other', async () => {
  const slow = counted('slow', 800);
  const fast = counted('fast', 10);
  const pSlow = getOrCompute(0, 'dash:slow', 300, slow.fn);
  await sleep(20);
  const t0 = Date.now();
  assert.equal(await getOrCompute(1, 'dash:fast', 300, fast.fn), 'fast');
  assert.ok(Date.now() - t0 < 500, 'an unrelated key was blocked by another key\'s computation');
  await pSlow;
});

test('a failed computation does not block the key afterwards', async () => {
  const failing = async () => { await sleep(50); throw new Error('warehouse timeout'); };
  await assert.rejects(getOrCompute(0, 'dash:org3', 300, failing));
  const ok = counted({ ok: true }, 10);
  const t0 = Date.now();
  assert.deepEqual(await getOrCompute(1, 'dash:org3', 300, ok.fn), { ok: true });
  assert.ok(Date.now() - t0 < 2000, `next request waited ${Date.now() - t0} ms after a failure`);
});
