import { createHash } from 'node:crypto';
import type pg from 'pg';
import { withTx } from '../db/tx.ts';
import { HttpError } from '../http/errors.ts';
import { enqueue } from '../outbox/outbox.ts';
import { config } from '../config.ts';
import { loadOrderView } from './repo.ts';
import type { OrderEvent, OrderView, PlaceOrderInput } from './types.ts';

const hashOf = (input: PlaceOrderInput) =>
  createHash('sha256').update(JSON.stringify({
    customerId: input.customerId,
    items: input.items.map((i) => [i.sku, i.qty, i.unitPriceCents]),
  })).digest('hex');

export async function placeOrder(pool: pg.Pool, key: string, input: PlaceOrderInput): Promise<{ created: boolean; view: OrderView }> {
  const hash = hashOf(input);
  const prev = await pool.query<{ request_hash: string; order_id: string }>(
    'SELECT request_hash, order_id FROM idempotency_keys WHERE key = $1', [key]);
  if (prev.rows[0]) {
    if (prev.rows[0].request_hash !== hash) throw new HttpError(422, 'Idempotency-Key was used for a different request');
    return { created: false, view: (await loadOrderView(pool, prev.rows[0].order_id))! };
  }
  return withTx(pool, async (c) => {
    const customer = await c.query('SELECT 1 FROM customers WHERE id = $1', [input.customerId]);
    if (customer.rowCount === 0) throw new HttpError(422, 'unknown customer');
    const total = input.items.reduce((s, i) => s + i.qty * i.unitPriceCents, 0);
    const o = await c.query<{ id: string }>(
      `INSERT INTO orders (customer_id, status, total_cents, version) VALUES ($1, 'placed', $2, 1) RETURNING id`,
      [input.customerId, total]);
    const orderId = o.rows[0].id;
    for (const [line, it] of input.items.entries()) {
      await c.query('INSERT INTO order_items (order_id, line, sku, qty, unit_price_cents) VALUES ($1, $2, $3, $4, $5)',
        [orderId, line + 1, it.sku, it.qty, it.unitPriceCents]);
    }
    const view = (await loadOrderView(c, orderId))!;
    const event: OrderEvent = { type: 'OrderPlaced', orderId, version: view.version, occurredAt: new Date().toISOString(), order: view };
    await enqueue(c, { topic: config.orderEventsTopic, aggregateId: orderId, eventType: event.type, payload: event });
    await c.query('INSERT INTO idempotency_keys (key, request_hash, order_id) VALUES ($1, $2, $3)', [key, hash, orderId]);
    return { created: true, view };
  });
}
