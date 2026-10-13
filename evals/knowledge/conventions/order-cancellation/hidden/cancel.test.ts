import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { setBus, type DomainEvent } from '../src/events/bus.ts';
import { relayOutbox } from '../src/events/outbox.ts';
import { placeOrder } from '../src/orders/place.ts';
import { markPaid } from '../src/orders/pay.ts';
import { cancelOrder } from '../src/orders/cancel.ts';
import { OrderStateError } from '../src/orders/errors.ts';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
const events: DomainEvent[] = [];
const bus = {
  down: false,
  async publish(e: DomainEvent) {
    if (bus.down) throw new Error('broker unavailable');
    events.push(e);
  },
};

before(async () => {
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
  await pool.query(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  await pool.query(`INSERT INTO customers(email, name) VALUES ('ana@example.com', 'Ana')`);
  await pool.query(`INSERT INTO products VALUES ('MUG', 'Mug', 900, 10), ('TEE', 'T-shirt', 2500, 5)`);
  setBus(bus);
});
after(() => pool.end());

const stock = async (sku: string) => (await pool.query('SELECT stock FROM products WHERE sku = $1', [sku])).rows[0].stock;
const status = async (id: number) => (await pool.query('SELECT status FROM orders WHERE id = $1', [id])).rows[0].status;
// What the downstream services eventually receive: run the deployed relay until the outbox is drained.
async function delivered() {
  for (let i = 0; i < 10 && (await relayOutbox(pool, bus)) > 0; i++);
  return events;
}
const cancelledFor = (id: number) => events.filter((e) => e.type === 'order.cancelled' && (e.payload as any)?.orderId === id);

test('cancel restocks, marks cancelled and the event reaches subscribers', async () => {
  const id = await placeOrder(pool, 1, [{ sku: 'MUG', quantity: 2 }, { sku: 'TEE', quantity: 1 }]);
  await cancelOrder(pool, id);
  assert.equal(await status(id), 'cancelled');
  assert.equal(await stock('MUG'), 10);
  assert.equal(await stock('TEE'), 5);
  await delivered();
  const got = cancelledFor(id);
  assert.equal(got.length, 1);
  const p = got[0].payload as any;
  assert.equal(p.customerId, 1);
  assert.deepEqual([...p.items].map((x: any) => [x.sku, x.quantity]).sort(), [['MUG', 2], ['TEE', 1]]);
});

test('shipped or unknown orders cannot be cancelled and announce nothing', async () => {
  const id = await placeOrder(pool, 1, [{ sku: 'MUG', quantity: 1 }]);
  await pool.query(`UPDATE orders SET status = 'shipped' WHERE id = $1`, [id]);
  await assert.rejects(cancelOrder(pool, id), OrderStateError);
  await assert.rejects(cancelOrder(pool, 999_999), OrderStateError);
  await delivered();
  assert.equal(cancelledFor(id).length, 0);
  assert.equal(await stock('MUG'), 9);
});

test('a broker outage during the cancel does not lose the cancellation event', async () => {
  const id = await placeOrder(pool, 1, [{ sku: 'TEE', quantity: 2 }]);
  await markPaid(pool, id, 'pay_9');
  await delivered();
  bus.down = true;
  try {
    await cancelOrder(pool, id);
  } catch {
    // whether the call reports the outage or not, the order state below is what matters
  }
  bus.down = false;
  const st = await status(id);
  await delivered();
  if (st === 'cancelled') {
    assert.equal(cancelledFor(id).length, 1, 'the order was cancelled but warehouse/billing never heard about it');
  } else {
    assert.equal(cancelledFor(id).length, 0, 'an event went out for a cancel that did not happen');
  }
});
