import type pg from 'pg';

export async function cancelOrder(pool: pg.Pool, orderId: number): Promise<void> {
  throw new Error('not implemented');
}
