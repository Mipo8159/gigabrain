import { createPool } from '../src/db/pool.ts';
import { migrate } from '../src/db/migrate.ts';
import type pg from 'pg';

export async function testPool() {
  const pool = createPool(process.env.DATABASE_URL!);
  await migrate(pool);
  return pool;
}

export const fixedClock = (iso: string) => ({ now: () => new Date(iso) });

export async function seedSubscription(pool: pg.Pool, s: {
  customerId: string; timezone?: string; planId?: string; startedAt: string; nextBillAt: string;
}): Promise<string> {
  await pool.query(`INSERT INTO plans (id, name, price_minor, currency, interval) VALUES ('pro-monthly', 'Pro', 1900, 'EUR', 'month')
    ON CONFLICT DO NOTHING`);
  await pool.query('INSERT INTO customers (id, email, timezone) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
    [s.customerId, `${s.customerId}@example.com`, s.timezone ?? 'UTC']);
  const r = await pool.query(
    `INSERT INTO subscriptions (customer_id, plan_id, status, started_at, next_bill_at) VALUES ($1, $2, 'active', $3, $4) RETURNING id::text`,
    [s.customerId, s.planId ?? 'pro-monthly', s.startedAt, s.nextBillAt]);
  return r.rows[0].id;
}
