import type pg from 'pg';

export async function findCustomerByEmail(db: pg.Pool, email: string) {
  const { rows } = await db.query('SELECT id, email, name FROM customers WHERE lower(email) = lower($1)', [email.trim()]);
  return rows[0] ?? null;
}

export async function createCustomer(db: pg.Pool, email: string, name: string) {
  const { rows } = await db.query('INSERT INTO customers(email, name) VALUES ($1, $2) RETURNING id, email, name', [email.trim(), name]);
  return rows[0];
}
