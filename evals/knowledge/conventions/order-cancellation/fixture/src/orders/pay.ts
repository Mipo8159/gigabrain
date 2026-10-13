import type pg from 'pg';
import { withTx } from '../db/tx.ts';
import { addToOutbox } from '../events/outbox.ts';
import { OrderStateError } from './errors.ts';

export async function markPaid(pool: pg.Pool, orderId: number, paymentRef: string): Promise<void> {
  await withTx(pool, async (tx) => {
    const { rows } = await tx.query(
      `UPDATE orders SET status = 'paid', updated_at = now() WHERE id = $1 AND status = 'pending' RETURNING customer_id, total_cents`,
      [orderId],
    );
    if (!rows.length) throw new OrderStateError(`order ${orderId} is not pending`);
    await addToOutbox(tx, 'order.paid', { orderId, customerId: rows[0].customer_id, totalCents: rows[0].total_cents, paymentRef });
  });
}
