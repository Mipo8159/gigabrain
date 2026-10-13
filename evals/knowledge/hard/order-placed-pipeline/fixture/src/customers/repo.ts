import type { Db } from '../db/pool.ts';

export type Customer = { id: string; name: string; email: string };

export async function getCustomer(db: Db, id: string): Promise<Customer | null> {
  const r = await db.query<Customer>('SELECT id, name, email FROM customers WHERE id = $1', [id]);
  return r.rows[0] ?? null;
}

export async function listCustomerOrderIds(db: Db, customerId: string, limit = 20): Promise<string[]> {
  const r = await db.query<{ id: string }>(
    'SELECT id FROM orders WHERE customer_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2', [customerId, limit]);
  return r.rows.map((x) => x.id);
}
