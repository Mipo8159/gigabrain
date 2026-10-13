import type pg from 'pg';
import { withTenant } from '../db/tenant.ts';

export interface Customer { id: number; name: string; email: string }

export function createCustomer(pool: pg.Pool, tenantId: number, name: string, email: string): Promise<Customer> {
  return withTenant(pool, tenantId, async (db) => {
    const { rows } = await db.query<Customer>(
      'INSERT INTO customers(tenant_id, name, email) VALUES ($1, $2, $3) RETURNING id, name, email',
      [tenantId, name, email],
    );
    return rows[0];
  });
}

export function listCustomers(pool: pg.Pool, tenantId: number): Promise<Customer[]> {
  return withTenant(pool, tenantId, async (db) =>
    (await db.query<Customer>('SELECT id, name, email FROM customers ORDER BY name')).rows);
}
