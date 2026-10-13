import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createClient, type RedisClientType } from 'redis';
import { createProfileCache } from '../src/profileCache.ts';
import { InMemoryProfileStore, type Profile } from '../src/store.ts';

const url = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
let a: RedisClientType, b: RedisClientType, admin: RedisClientType;

before(async () => {
  [a, b, admin] = [0, 1, 2].map(() => createClient({ url }) as RedisClientType);
  for (const c of [a, b, admin]) { c.on('error', () => {}); await c.connect(); }
});
after(() => { for (const c of [a, b, admin]) c.destroy(); });
beforeEach(async () => { await admin.flushAll(); });

function gate() { let open!: () => void; const p = new Promise<void>((r) => (open = r)); return { p, open }; }

// A store whose next get()/update() can be paused by the test, to reproduce peak-load timing.
class ControlledStore extends InMemoryProfileStore {
  gets = 0;
  pauseNextGet: { reached: ReturnType<typeof gate>; release: ReturnType<typeof gate> } | null = null;
  pauseNextUpdate: { reached: ReturnType<typeof gate>; release: ReturnType<typeof gate> } | null = null;
  async get(id: string) {
    this.gets++;
    const snapshot = await super.get(id); // row read now...
    const p = this.pauseNextGet; this.pauseNextGet = null;
    if (p) { p.reached.open(); await p.release.p; } // ...returned later
    return snapshot;
  }
  async update(id: string, patch: Partial<Pick<Profile, 'displayName' | 'avatarUrl'>>) {
    const res = await super.update(id, patch); // committed now...
    const p = this.pauseNextUpdate; this.pauseNextUpdate = null;
    if (p) { p.reached.open(); await p.release.p; } // ...acknowledged later
    return res;
  }
}

function seeded() {
  const store = new ControlledStore();
  store.rows.set('u1', { id: 'u1', displayName: 'Old Name', avatarUrl: 'a.png', updatedAt: 1 });
  return store;
}

test('reads are cached and expire', async () => {
  const store = seeded();
  const cache = createProfileCache(a, store, { ttlSeconds: 1800 });
  assert.equal((await cache.get('u1'))!.displayName, 'Old Name');
  assert.equal((await cache.get('u1'))!.displayName, 'Old Name');
  assert.equal((await createProfileCache(b, store, { ttlSeconds: 1800 }).get('u1'))!.displayName, 'Old Name');
  assert.equal(store.gets, 1, 'second and third reads should come from Redis');
  const keys = await admin.keys('*');
  const ttls = await Promise.all(keys.map((k) => admin.pTTL(k)));
  assert.ok(ttls.every((t) => t > 0), 'every cache key must expire');
  assert.equal(await cache.get('missing'), null);
});

test('update is visible on every instance', async () => {
  const store = seeded();
  const ia = createProfileCache(a, store, { ttlSeconds: 1800 });
  const ib = createProfileCache(b, store, { ttlSeconds: 1800 });
  await ia.get('u1');
  await ib.update('u1', { displayName: 'New Name' });
  assert.equal((await ia.get('u1'))!.displayName, 'New Name');
});

test('a read that was in flight during the edit does not bring the old profile back', async () => {
  const store = seeded();
  const reader = createProfileCache(a, store, { ttlSeconds: 1800 });
  const writer = createProfileCache(b, store, { ttlSeconds: 1800 });

  store.pauseNextGet = { reached: gate(), release: gate() };
  const pause = store.pauseNextGet;
  const slowRead = reader.get('u1');          // cache miss, reads the old row from the DB...
  await pause.reached.p;
  await writer.update('u1', { displayName: 'New Name' }); // ...the user edits their profile meanwhile
  pause.release.open();
  await slowRead;                              // the slow read finishes after the edit

  assert.equal((await reader.get('u1'))!.displayName, 'New Name');
  assert.equal((await writer.get('u1'))!.displayName, 'New Name');
});

test('two quick edits on different instances end with the latest one', async () => {
  const store = seeded();
  const i1 = createProfileCache(a, store, { ttlSeconds: 1800 });
  const i2 = createProfileCache(b, store, { ttlSeconds: 1800 });
  await i1.get('u1');

  store.pauseNextUpdate = { reached: gate(), release: gate() };
  const pause = store.pauseNextUpdate;
  const first = i1.update('u1', { displayName: 'Second Name' }); // committed first, slow to come back
  await pause.reached.p;
  await i2.update('u1', { displayName: 'Third Name' });          // committed second, fast
  pause.release.open();
  await first;

  assert.equal(store.rows.get('u1')!.displayName, 'Third Name');
  assert.equal((await i1.get('u1'))!.displayName, 'Third Name');
  assert.equal((await i2.get('u1'))!.displayName, 'Third Name');
});
