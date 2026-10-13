import type pg from 'pg';
import { enqueueEvent } from './outbox.ts';

export type Order = { id: string; customerId: string; totalCents: number };

export async function placeOrder(pool: pg.Pool, order: Order): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO orders (id, customer_id, total_cents) VALUES ($1, $2, $3)', [
      order.id,
      order.customerId,
      order.totalCents,
    ]);
    await enqueueEvent(client, { aggregateId: order.id, type: 'OrderPlaced', payload: order });
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
