import type pg from 'pg';
import { withTx } from '../db/tx.ts';
import { addToOutbox } from '../events/outbox.ts';
import { OutOfStockError } from './errors.ts';

export interface OrderLine { sku: string; quantity: number }

export async function placeOrder(pool: pg.Pool, customerId: number, lines: OrderLine[]): Promise<number> {
  return withTx(pool, async (tx) => {
    let total = 0;
    const items: Array<OrderLine & { priceCents: number }> = [];
    for (const l of [...lines].sort((a, b) => a.sku.localeCompare(b.sku))) {   // stable lock order
      const { rows } = await tx.query(
        'UPDATE products SET stock = stock - $2 WHERE sku = $1 AND stock >= $2 RETURNING price_cents',
        [l.sku, l.quantity],
      );
      if (!rows.length) throw new OutOfStockError(l.sku);
      total += rows[0].price_cents * l.quantity;
      items.push({ ...l, priceCents: rows[0].price_cents });
    }
    const { rows: [order] } = await tx.query(
      `INSERT INTO orders(customer_id, status, total_cents) VALUES ($1, 'pending', $2) RETURNING id`,
      [customerId, total],
    );
    for (const it of items) {
      await tx.query('INSERT INTO order_items(order_id, sku, quantity, price_cents) VALUES ($1, $2, $3, $4)',
        [order.id, it.sku, it.quantity, it.priceCents]);
    }
    await addToOutbox(tx, 'order.placed', { orderId: order.id, customerId, totalCents: total, items: lines });
    return order.id as number;
  });
}
