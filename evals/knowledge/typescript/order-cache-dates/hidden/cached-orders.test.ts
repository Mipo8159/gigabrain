import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCachedOrders } from '../src/cached-orders.ts';
import type { KV } from '../src/kv.ts';
import type { Order, OrderRepo } from '../src/types.ts';

class FakeKV implements KV {
  store = new Map<string, string>();
  sets: { key: string; ttl: number }[] = [];
  async get(k: string) { return this.store.get(k) ?? null; }
  async set(k: string, v: string, ttl: number) { this.store.set(k, v); this.sets.push({ key: k, ttl }); }
  async del(k: string) { this.store.delete(k); }
}

function order(id: string, paid: boolean): Order {
  return {
    id, customerId: 'c1', status: paid ? 'paid' : 'pending', totalCents: 2598,
    lines: [{ sku: 'A-1', qty: 2, unitCents: 1299 }],
    createdAt: new Date('2026-03-04T10:11:12.345Z'),
    paidAt: paid ? new Date('2026-03-04T10:15:00.000Z') : null,
  };
}

function repoOf(...orders: Order[]) {
  const calls: string[] = [];
  const repo: OrderRepo = {
    async findById(id) { calls.push(id); const o = orders.find(x => x.id === id); return o ? structuredClone(o) : null; },
  };
  return { repo, calls };
}

test('a cache hit returns a real Order: dates are Dates', async () => {
  const kv = new FakeKV();
  const { repo, calls } = repoOf(order('o1', true), order('o2', false));
  const svc = createCachedOrders(kv, repo);
  await svc.get('o1');
  await svc.get('o2');
  assert.ok(kv.store.has('order:o1'));
  assert.equal(kv.sets[0]?.ttl, 300);

  const a = await svc.get('o1');
  const b = await svc.get('o2');
  assert.deepEqual(calls, ['o1', 'o2'], 'second reads must come from the cache');
  assert.ok(a && b);
  assert.ok(a.createdAt instanceof Date, 'createdAt must be a Date after a cache hit');
  assert.equal(a.createdAt.getTime(), Date.parse('2026-03-04T10:11:12.345Z'));
  assert.ok(a.paidAt instanceof Date);
  assert.equal(a.paidAt.getTime() - a.createdAt.getTime(), 227_655);
  assert.equal(b.paidAt, null, 'an unpaid order must stay unpaid after a cache hit');
  assert.deepEqual(a, order('o1', true));
});

test('entries written by the legacy service (offset timestamps) are read correctly', async () => {
  const kv = new FakeKV();
  const { repo, calls } = repoOf(order('o3', true));
  kv.store.set('order:o3', JSON.stringify({
    id: 'o3', customerId: 'c1', status: 'paid', totalCents: 2598,
    lines: [{ sku: 'A-1', qty: 2, unitCents: 1299 }],
    createdAt: '2026-03-04T14:11:12.345+04:00', paidAt: '2026-03-04T14:15:00+04:00',
  }));
  const o = await createCachedOrders(kv, repo, { ttlSec: 60 }).get('o3');
  assert.deepEqual(calls, []);
  assert.ok(o && o.createdAt instanceof Date && o.paidAt instanceof Date);
  assert.equal(o.createdAt.toISOString(), '2026-03-04T10:11:12.345Z');
});

test('unusable entries fall back to the database', async () => {
  const bad = [
    '{"id":"o1",',
    JSON.stringify({ id: 'o1', customerId: 'c1' }),
    JSON.stringify({ ...JSON.parse(JSON.stringify(order('o1', true))), createdAt: null }),
    JSON.stringify({ ...JSON.parse(JSON.stringify(order('o1', true))), createdAt: 'not a date' }),
    JSON.stringify({ ...JSON.parse(JSON.stringify(order('o1', true))), totalCents: '2598' }),
  ];
  for (const raw of bad) {
    const kv = new FakeKV();
    kv.store.set('order:o1', raw);
    const { repo, calls } = repoOf(order('o1', true));
    const o = await createCachedOrders(kv, repo).get('o1');
    assert.deepEqual(calls, ['o1'], `entry ${raw} must not be served`);
    assert.deepEqual(o, order('o1', true));
  }
});

test('a cache outage does not fail the lookup', async () => {
  const kv: KV = {
    async get() { throw new Error('ECONNRESET'); },
    async set() { throw new Error('ECONNRESET'); },
    async del() { throw new Error('ECONNRESET'); },
  };
  const { repo } = repoOf(order('o1', false));
  const o = await createCachedOrders(kv, repo).get('o1');
  assert.deepEqual(o, order('o1', false));
  assert.equal(await createCachedOrders(kv, repo).get('missing'), null);
});
