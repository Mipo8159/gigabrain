import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type pg from 'pg';
import { setupDb, memoryBus } from './setup.ts';
import { placeOrder } from '../src/orders/place.ts';
import { markPaid } from '../src/orders/pay.ts';
import { relayOutbox } from '../src/events/outbox.ts';
import { OutOfStockError } from '../src/orders/errors.ts';

let pool: pg.Pool;
before(async () => { pool = await setupDb(); });
after(() => pool.end());

test('placing and paying an order emits events through the outbox', async () => {
  const bus = memoryBus();
  const id = await placeOrder(pool, 1, [{ sku: 'MUG', quantity: 2 }]);
  await markPaid(pool, id, 'pay_1');
  assert.equal(bus.events.length, 0, 'nothing is published before the relay runs');
  await relayOutbox(pool);
  assert.deepEqual(bus.events.map((e) => e.type), ['order.placed', 'order.paid']);
});

test('a failed order leaves no event and no stock change', async () => {
  const bus = memoryBus();
  await assert.rejects(placeOrder(pool, 1, [{ sku: 'MUG', quantity: 1 }, { sku: 'TEE', quantity: 99 }]), OutOfStockError);
  await relayOutbox(pool);
  assert.equal(bus.events.length, 0);
  const { rows } = await pool.query(`SELECT stock FROM products WHERE sku = 'MUG'`);
  assert.equal(rows[0].stock, 8);
});
