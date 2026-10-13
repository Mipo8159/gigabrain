import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { createClient, type RedisClientType } from 'redis';
import { withLock } from '../src/lock.ts';

const url = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
let a: RedisClientType, b: RedisClientType, admin: RedisClientType;

before(async () => {
  [a, b, admin] = [0, 1, 2].map(() => createClient({ url }) as RedisClientType);
  for (const c of [a, b, admin]) { c.on('error', () => {}); await c.connect(); }
});
after(() => { for (const c of [a, b, admin]) c.destroy(); });
beforeEach(async () => { await admin.flushAll(); });

function gate() { let open!: () => void; const p = new Promise<void>((r) => (open = r)); return { p, open }; }

test('only one holder at a time; free again after release', async () => {
  const g = gate();
  const first = withLock(a, 'job1', 5000, async () => { await g.p; return 'A'; });
  await sleep(50);
  assert.deepEqual(await withLock(b, 'job1', 5000, async () => 'B'), { acquired: false });
  g.open();
  assert.deepEqual(await first, { acquired: true, value: 'A' });
  assert.deepEqual(await withLock(b, 'job1', 5000, async () => 'B'), { acquired: true, value: 'B' });
});

test('releases when fn throws', async () => {
  await assert.rejects(withLock(a, 'job2', 5000, async () => { throw new Error('boom'); }), /boom/);
  assert.deepEqual(await withLock(b, 'job2', 5000, async () => 1), { acquired: true, value: 1 });
});


// Simulate "the holder's lock expired while it was still working" by expiring the key from outside.
// Waiting out the TTL instead would wrongly fail a correct design that renews its lock while fn runs
// (2026-10-13: both base runs built a renewing lock with IFEQ compare-and-set and failed only for that).
async function expireLockKeys(name: string) {
  for (const k of await admin.keys(`*${name}*`)) await admin.del(k);
}

test('a holder that overran its TTL does not release the next holder\'s lock', async () => {
  const gA = gate(), gB = gate();
  const slowA = withLock(a, 'job3', 100, async () => { await gA.p; return 'A'; });
  await sleep(150);
  await expireLockKeys('job3'); // A's lock has expired while A is still working
  const holderB = withLock(b, 'job3', 5000, async () => { await gB.p; return 'B'; });
  await sleep(50);
  gA.open();
  await slowA; // A finishes late and releases
  assert.deepEqual(await withLock(admin, 'job3', 5000, async () => 'C'), { acquired: false },
    'B still holds the lock, so a third caller must not get it');
  gB.open();
  assert.deepEqual(await holderB, { acquired: true, value: 'B' });
});

test('two holders in the same process do not share an identity', async () => {
  const gA = gate(), gB = gate();
  const slowA = withLock(a, 'job4', 100, async () => { await gA.p; return 'A'; });
  await sleep(150);
  await expireLockKeys('job4');
  const holderB = withLock(a, 'job4', 5000, async () => { await gB.p; return 'B'; });
  await sleep(50);
  gA.open();
  await slowA;
  assert.deepEqual(await withLock(b, 'job4', 5000, async () => 'C'), { acquired: false });
  gB.open();
  await holderB;
});

test('release is a single atomic step (lock taken over between check and delete survives)', async () => {
  // Simulates the lock expiring and another instance acquiring it right after this client read it.
  let armed = false;
  let intruded = false;
  const racy = new Proxy(a, {
    get(t, p) {
      const v = Reflect.get(t, p, t);
      if (typeof v !== 'function') return v;
      if (p === 'get' || p === 'GET') {
        return async (...args: any[]) => {
          const r = await v.apply(t, args);
          if (armed && r !== null && typeof args[0] === 'string') {
            armed = false;
            intruded = true;
            await admin.set(args[0], 'other-instance', { expiration: { type: 'PX', value: 5000 } });
          }
          return r;
        };
      }
      return v.bind(t);
    },
  }) as RedisClientType;
  const res = await withLock(racy, 'job5', 5000, async () => { armed = true; return 'A'; });
  assert.deepEqual(res, { acquired: true, value: 'A' });
  if (!intruded) return; // release never read the key from the client, so there is no check-then-delete gap
  assert.deepEqual(await withLock(b, 'job5', 5000, async () => 'C'), { acquired: false },
    'the other instance\'s lock must survive A\'s release');
});
