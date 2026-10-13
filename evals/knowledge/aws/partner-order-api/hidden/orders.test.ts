import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { FakeDynamo } from './fake-ddb.ts';

const fake = new FakeDynamo({ orders: ['orderId'] });
let mod: typeof import('../src/orders.ts');

before(async () => {
  await fake.start();
  process.env.ORDERS_TABLE = 'orders';
  mod = await import('../src/orders.ts');
});
after(() => fake.stop());
beforeEach(() => fake.reset());

// Parse JSON keeping unsafe integers as their exact digits (a JSON string or a bare number literal both count).
const parse = (s: string) => JSON.parse(s, (_k, v, ctx?: { source?: string }) =>
  typeof v === 'number' && !Number.isSafeInteger(v) && ctx?.source && /^-?\d+$/.test(ctx.source) ? ctx.source : v);

test('saves an order whose optional fields are undefined', async () => {
  await mod.saveOrder({
    orderId: 'o-1',
    partnerOrderNo: 9007199254740993n,
    status: 'NEW',
    lines: [{ sku: 'A', qty: 2, note: undefined }, { sku: 'B', qty: 1, note: 'gift' }],
    shipping: { method: 'standard', instructions: undefined },
    raw: { source: 'portal' },
  });
  const stored = fake.get('orders', { orderId: { S: 'o-1' } });
  assert.ok(stored, 'order was not written');
  assert.equal(stored.partnerOrderNo.N, '9007199254740993');
  assert.equal(stored.shipping.M.method.S, 'standard');
  assert.equal(stored.shipping.M.instructions, undefined);
});

test('serves an order whose int64 values exceed 2^53, exactly and unchanged', async () => {
  fake.seed('orders', {
    orderId: { S: 'o-2' },
    partnerOrderNo: { N: '9007199254740993' },
    status: { S: 'SHIPPED' },
    lines: { L: [{ M: { sku: { S: 'A' }, qty: { N: '3' } } }] },
    shipping: { M: { method: { S: 'express' } } },
    raw: { M: {
      ref: { N: '9223372036854775807' },
      lineIds: { L: [{ N: '9007199254740995' }, { N: '7' }] },
      price: { N: '12.5' },
      channel: { S: 'app' },
    } },
  });
  const res = await mod.getOrderResponse('o-2');
  assert.equal(res.statusCode, 200);
  const body = parse(res.body);
  assert.equal(body.orderId, 'o-2');
  assert.equal(body.partnerOrderNo, '9007199254740993');
  assert.equal(body.status, 'SHIPPED');
  assert.deepEqual(body.lines, [{ sku: 'A', qty: 3 }]);
  assert.deepEqual(body.raw, { ref: '9223372036854775807', lineIds: ['9007199254740995', 7], price: 12.5, channel: 'app' });
});

test('round trip through saveOrder and getOrderResponse', async () => {
  await mod.saveOrder({
    orderId: 'o-3', partnerOrderNo: 42, status: 'NEW',
    lines: [{ sku: 'C', qty: 1 }], shipping: { method: 'pickup' }, raw: { a: 1 },
  });
  const body = parse((await mod.getOrderResponse('o-3')).body);
  assert.equal(body.partnerOrderNo, '42');
  assert.deepEqual(body.raw, { a: 1 });
});

test('404 for a missing order', async () => {
  const res = await mod.getOrderResponse('nope');
  assert.equal(res.statusCode, 404);
});
