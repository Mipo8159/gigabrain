import type pg from 'pg';
import { withTx } from '../db/tx.ts';
import { addToOutbox } from '../events/outbox.ts';
import { OrderStateError } from './errors.ts';

export async function cancelOrder(pool: pg.Pool, orderId: number): Promise<void> {
  await withTx(pool, async (tx) => {
    const { rows } = await tx.query('SELECT customer_id, status FROM orders WHERE id = $1 FOR UPDATE', [orderId]);
    if (!rows.length) throw new OrderStateError(`order ${orderId} not found`);
    if (rows[0].status !== 'pending' && rows[0].status !== 'paid') {
      throw new OrderStateError(`order ${orderId} is ${rows[0].status}`);
    }
    const items = (await tx.query('SELECT sku, quantity FROM order_items WHERE order_id = $1 ORDER BY sku', [orderId])).rows;
    for (const it of items) await tx.query('UPDATE products SET stock = stock + $2 WHERE sku = $1', [it.sku, it.quantity]);
    await tx.query(`UPDATE orders SET status = 'cancelled', updated_at = now() WHERE id = $1`, [orderId]);
    await addToOutbox(tx, 'order.cancelled', { orderId, customerId: rows[0].customer_id, items });
  });
}
