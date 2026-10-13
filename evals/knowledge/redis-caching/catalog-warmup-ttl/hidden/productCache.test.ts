import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createClient, type RedisClientType } from 'redis';
import { ProductCache } from '../src/productCache.ts';
import { InMemoryProductRepo, type Product } from '../src/repo.ts';

const url = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
let client: RedisClientType;
let admin: RedisClientType;
const TTL = 600;

before(async () => {
  client = createClient({ url }) as RedisClientType;
  admin = createClient({ url }) as RedisClientType;
  client.on('error', () => {}); admin.on('error', () => {});
  await client.connect(); await admin.connect();
});
after(() => { client.destroy(); admin.destroy(); });
beforeEach(async () => { await admin.flushAll(); });

const products = (n: number): Product[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, title: `Product ${i}`, priceCents: 100 + i, stock: i }));

function setup(n = 20) {
  const repo = new InMemoryProductRepo(products(n));
  let finds = 0;
  const origFind = repo.find.bind(repo);
  repo.find = async (id: string) => { finds++; return origFind(id); };
  const cache = new ProductCache(client, repo, { ttlSeconds: TTL });
  return { repo, cache, finds: () => finds };
}

async function assertExpires(key: string) {
  const pttl = await admin.pTTL(key);
  assert.ok(pttl > 0 && pttl <= TTL * 1500, `${key} must keep expiring (PTTL ${pttl})`);
}

test('update: next read is a hit with the new data, and the entry still expires', async () => {
  const { cache, repo, finds } = setup();
  await cache.get('p1');
  const updated = await cache.update('p1', { priceCents: 999 });
  assert.equal(updated.priceCents, 999);
  assert.equal(repo.rows.get('p1')!.priceCents, 999);
  const before = finds();
  const p = await cache.get('p1');
  assert.equal(p!.priceCents, 999);
  assert.equal(finds(), before, 'read after update should be served from Redis');
  await assertExpires('product:p1');
});

test('update of a product that was not cached yet still leaves an expiring entry', async () => {
  const { cache } = setup();
  await cache.update('p2', { stock: 0 });
  assert.equal((await cache.get('p2'))!.stock, 0);
  await assertExpires('product:p2');
});

test('warm: preloads every existing product with an expiry and skips missing ones', async () => {
  const { cache, finds } = setup(300);
  const ids = [...products(300).map((p) => p.id), 'nope-1', 'nope-2'];
  await cache.warm(ids);
  for (const id of ['p0', 'p150', 'p299']) await assertExpires(`product:${id}`);
  const ttls = await Promise.all(products(300).map((p) => admin.pTTL(`product:${p.id}`)));
  assert.ok(ttls.every((t) => t > 0), `${ttls.filter((t) => t <= 0).length} warmed keys have no TTL`);
  assert.equal(await admin.exists('product:nope-1'), 0);
  const before = finds();
  assert.deepEqual(await cache.get('p42'), products(300)[42]);
  assert.equal(finds(), before, 'warmed products should be cache hits');
});
