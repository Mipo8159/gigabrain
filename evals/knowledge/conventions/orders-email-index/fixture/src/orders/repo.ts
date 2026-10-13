import type pg from 'pg';

export interface OrderRow { id: string; customer_id: string; email: string; status: string; total_cents: string; created_at: Date }

/** Support tool: all orders placed with an email, newest first. Emails are matched case-insensitively. */
export async function findOrdersByEmail(db: pg.Pool, email: string, limit = 50): Promise<OrderRow[]> {
  const { rows } = await db.query<OrderRow>(
    `SELECT id, customer_id, email, status, total_cents, created_at
       FROM orders
      WHERE lower(email) = lower($1)
      ORDER BY created_at DESC
      LIMIT $2`,
    [email.trim(), limit],
  );
  return rows;
}

export async function listOrdersForCustomer(db: pg.Pool, customerId: string, limit = 20): Promise<OrderRow[]> {
  const { rows } = await db.query<OrderRow>(
    `SELECT id, customer_id, email, status, total_cents, created_at
       FROM orders WHERE customer_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [customerId, limit],
  );
  return rows;
}
