import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createClient, type RedisClientType } from 'redis';
import { invalidatePrefix } from '../src/invalidate.ts';

const url = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
let client: RedisClientType;
let admin: RedisClientType;

before(async () => {
  client = createClient({ url }) as RedisClientType;
  admin = createClient({ url }) as RedisClientType;
  client.on('error', () => {});
  admin.on('error', () => {});
  await client.connect();
  await admin.connect();
});
after(() => { client.destroy(); admin.destroy(); });
beforeEach(async () => { await admin.flushAll(); await admin.configResetStat(); });

async function seed(tenant: string, n: number, others: number) {
  const m = admin.multi();
  for (let i = 0; i < n; i++) m.set(`catalog:${tenant}:product:${i}`, 'x', { expiration: { type: 'EX', value: 3600 } });
  for (let i = 0; i < others; i++) {
    m.set(`session:${i}`, 's');
    m.set(`catalog:other${i % 7}:product:${i}`, 'y');
  }
  await m.exec();
}

async function commandCalls(name: string): Promise<number> {
  const info = await admin.info('commandstats');
  const m = info.match(new RegExp(`cmdstat_${name}:calls=(\\d+)`));
  return m ? Number(m[1]) : 0;
}

test('removes exactly the tenant keys and reports how many', async () => {
  await seed('t42', 150, 3000);
  const before = await admin.dbSize();
  const n = await invalidatePrefix(client, 'catalog:t42:');
  assert.equal(n, 150);
  assert.equal(await admin.dbSize(), before - 150);
  assert.equal(await admin.exists('catalog:t42:product:0'), 0);
  assert.equal(await admin.exists('catalog:other1:product:1'), 1);
  assert.equal(await admin.exists('session:5'), 1);
});

test('never walks the keyspace with KEYS', async () => {
  await seed('t7', 120, 2000);
  await admin.configResetStat();
  await invalidatePrefix(client, 'catalog:t7:');
  assert.equal(await commandCalls('keys'), 0, 'KEYS blocks the server on a 20M-key instance');
  assert.equal(await admin.exists('catalog:t7:product:3'), 0);
});

test('a tenant with nothing cached is a no-op', async () => {
  await seed('t1', 0, 500);
  const before = await admin.dbSize();
  assert.equal(await invalidatePrefix(client, 'catalog:t1:'), 0);
  assert.equal(await admin.dbSize(), before);
});

test('does not touch keys of a tenant whose id only shares the beginning', async () => {
  await seed('t4', 30, 0);
  await seed('t40', 30, 0);
  assert.equal(await invalidatePrefix(client, 'catalog:t4:'), 30);
  assert.equal(await admin.exists('catalog:t40:product:0'), 1);
});
