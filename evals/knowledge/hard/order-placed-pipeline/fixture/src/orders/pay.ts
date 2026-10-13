import type pg from 'pg';
import { withTx } from '../db/tx.ts';
import { HttpError } from '../http/errors.ts';
import { enqueue } from '../outbox/outbox.ts';
import { config } from '../config.ts';
import { loadOrderView } from './repo.ts';
import type { OrderEvent, OrderView } from './types.ts';

/** Marks a placed order as paid and emits OrderPaid. Called by the payment webhook route. */
export async function markOrderPaid(pool: pg.Pool, orderId: string): Promise<OrderView> {
  return withTx(pool, async (c) => {
    const cur = await loadOrderView(c, orderId);
    if (!cur) throw new HttpError(404, 'order not found');
    const r = await c.query(
      `UPDATE orders SET status = 'paid', version = version + 1, updated_at = now()
        WHERE id = $1 AND status = 'placed'`, [orderId]);
    if (r.rowCount === 0) throw new HttpError(409, `order is ${cur.status}`);
    const view = (await loadOrderView(c, orderId))!;
    const event: OrderEvent = { type: 'OrderPaid', orderId, version: view.version, occurredAt: new Date().toISOString(), order: view };
    await enqueue(c, { topic: config.orderEventsTopic, aggregateId: orderId, eventType: event.type, payload: event });
    return view;
  });
}
