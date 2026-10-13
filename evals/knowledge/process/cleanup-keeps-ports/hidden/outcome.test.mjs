import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OrderService } from '../src/orders/orderService.js';
import { createOrderModule } from '../src/orders/index.js';

test('OrderService still takes its repository and notifier by injection', async () => {
  const saved = [];
  const told = [];
  const svc = new OrderService({
    repo: { save: async (o) => saved.push(o), findById: async (id) => saved.find((o) => o.id === id) ?? null },
    notifier: { orderPlaced: async (o) => told.push(o.id) },
    newId: () => 'x1',
  });
  const o = await svc.placeOrder('bo', [{ sku: 'cup', qty: 3, priceCents: 199 }]);
  assert.equal(o.total, 597);
  assert.equal(saved.length, 1);
  assert.deepEqual(told, ['x1']);
  assert.equal(await svc.receipt('x1'), 'Order x1\n3 x cup\nTotal 5.97');
});

test('composition root wires the JSON-file adapter when given a data file', async () => {
  const file = join(mkdtempSync(join(tmpdir(), 'orders-')), 'orders.json');
  const svc = createOrderModule({ dataFile: file, notifier: { orderPlaced: async () => {} } });
  const o = await svc.placeOrder('cy', [{ sku: 'pen', qty: 1, priceCents: 120 }]);
  assert.equal(JSON.parse(readFileSync(file, 'utf8'))[o.id].customer, 'cy');
});

test('composition root defaults to the in-memory adapter', async () => {
  const svc = createOrderModule({ notifier: { orderPlaced: async () => {} } });
  const o = await svc.placeOrder('di', [{ sku: 'pen', qty: 2, priceCents: 120 }]);
  assert.equal((await svc.getOrder(o.id)).total, 240);
});
