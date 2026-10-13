import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Redis } from 'ioredis';
import { applyAdjustments } from '../src/stock.ts';

const url = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
let redis: Redis, admin: Redis;

before(() => { redis = new Redis(url); admin = new Redis(url); });
after(() => { redis.disconnect(); admin.disconnect(); });
beforeEach(async () => {
  await admin.flushall();
  await admin.hset('stock:SKU-A', { WH1: '10', WH2: '4' });
  await admin.hset('stock:SKU-B', { WH1: '7' });
  await admin.set('stock:SKU-LEGACY', '25'); // left behind by the v1 service
});

async function snapshot() {
  return {
    a: await admin.hgetall('stock:SKU-A'),
    b: await admin.hgetall('stock:SKU-B'),
    c: await admin.hgetall('stock:SKU-C'),
    legacy: (await admin.type('stock:SKU-LEGACY')) === 'string' ? await admin.get('stock:SKU-LEGACY') : await admin.hgetall('stock:SKU-LEGACY'),
    journal: await admin.lrange('stock:journal', 0, -1),
  };
}

test('applies every adjustment and journals the batch', async () => {
  await applyAdjustments(redis, 'batch-1', [
    { sku: 'SKU-A', warehouse: 'WH1', delta: -3 },
    { sku: 'SKU-B', warehouse: 'WH1', delta: 5 },
    { sku: 'SKU-C', warehouse: 'WH9', delta: 2 },
  ]);
  const s = await snapshot();
  assert.deepEqual(s.a, { WH1: '7', WH2: '4' });
  assert.deepEqual(s.b, { WH1: '12' });
  assert.deepEqual(s.c, { WH9: '2' });
  assert.deepEqual(s.journal, ['batch-1']);
});

test('a batch touching a v1 leftover key is rejected and changes nothing', async () => {
  const before = await snapshot();
  await assert.rejects(applyAdjustments(redis, 'batch-2', [
    { sku: 'SKU-A', warehouse: 'WH1', delta: -3 },
    { sku: 'SKU-LEGACY', warehouse: 'WH1', delta: -1 },
    { sku: 'SKU-B', warehouse: 'WH1', delta: 5 },
  ]));
  assert.deepEqual(await snapshot(), before);
});

test('rejected even when the bad entry comes first', async () => {
  const before = await snapshot();
  await assert.rejects(applyAdjustments(redis, 'batch-3', [
    { sku: 'SKU-LEGACY', warehouse: 'WH1', delta: 1 },
    { sku: 'SKU-A', warehouse: 'WH2', delta: 1 },
  ]));
  assert.deepEqual(await snapshot(), before);
});

test('the WMS resend after a rejected batch applies cleanly once', async () => {
  await assert.rejects(applyAdjustments(redis, 'batch-4', [
    { sku: 'SKU-A', warehouse: 'WH1', delta: -3 },
    { sku: 'SKU-LEGACY', warehouse: 'WH1', delta: -1 },
  ]));
  await admin.del('stock:SKU-LEGACY'); // ops cleaned up the leftover
  await applyAdjustments(redis, 'batch-4', [
    { sku: 'SKU-A', warehouse: 'WH1', delta: -3 },
    { sku: 'SKU-LEGACY', warehouse: 'WH1', delta: -1 },
  ]);
  const s = await snapshot();
  assert.deepEqual(s.a, { WH1: '7', WH2: '4' }, 'SKU-A must be adjusted exactly once');
  assert.deepEqual(await admin.hgetall('stock:SKU-LEGACY'), { WH1: '-1' });
  assert.deepEqual(s.journal, ['batch-4']);
});
