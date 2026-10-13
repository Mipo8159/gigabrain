import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OrderService } from '../src/orders/orderService.js';
import { MemoryOrderRepository } from '../src/orders/adapters/memoryOrderRepository.js';

function setup() {
  const sent = [];
  let n = 0;
  const svc = new OrderService({
    repo: new MemoryOrderRepository(),
    notifier: { orderPlaced: async (o) => sent.push(o.id) },
    newId: () => `o${++n}`,
  });
  return { svc, sent };
}

test('places an order and notifies', async () => {
  const { svc, sent } = setup();
  const o = await svc.placeOrder('ann', [{ sku: 'tea', qty: 2, priceCents: 350 }]);
  assert.equal(o.total, 700);
  assert.deepEqual(sent, ['o1']);
  assert.equal((await svc.getOrder('o1')).customer, 'ann');
});

test('rejects bad lines', async () => {
  const { svc } = setup();
  await assert.rejects(svc.placeOrder('ann', []), /at least one line/);
  await assert.rejects(svc.placeOrder('ann', [{ sku: 'tea', qty: 0, priceCents: 1 }]), /bad qty/);
});

test('receipt', async () => {
  const { svc } = setup();
  await svc.placeOrder('ann', [{ sku: 'tea', qty: 2, priceCents: 350 }]);
  assert.equal(await svc.receipt('o1'), 'Order o1\n2 x tea\nTotal 7.00');
});
