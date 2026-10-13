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

/**
 * Places an order once per idempotency key. The key row is inserted first: a concurrent request with
 * the same key blocks on it until the first transaction ends, then sees the stored response.
 */
export async function placeOrder(pool: pg.Pool, key: string, input: PlaceOrderInput): Promise<{ created: boolean; view: OrderView }> {
  const hash = hashOf(input);
  return withTx(pool, async (c) => {
    const claimed = await c.query(
      'INSERT INTO idempotency_keys (key, request_hash) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING RETURNING key',
      [key, hash]);
    if (claimed.rowCount === 0) {
      const prev = await c.query<{ request_hash: string; response: OrderView | null }>(
        'SELECT request_hash, response FROM idempotency_keys WHERE key = $1', [key]);
      const row = prev.rows[0];
      if (!row || row.request_hash !== hash) throw new HttpError(422, 'Idempotency-Key was used for a different request');
      if (!row.response) throw new HttpError(409, 'a request with this Idempotency-Key is in progress');
      return { created: false, view: row.response };
    }

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
    await c.query('UPDATE idempotency_keys SET response = $2 WHERE key = $1', [key, JSON.stringify(view)]);
    return { created: true, view };
  });
}
