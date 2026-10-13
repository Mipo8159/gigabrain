import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createPool } from '../src/db.ts';
import { migrate } from '../db/migrate.ts';
import { createCustomer } from '../src/customers/repo.ts';
import { findOrdersByEmail } from '../src/orders/repo.ts';

const pool = createPool();
before(async () => { await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public'); });
after(() => pool.end());

test('migrations apply cleanly and are idempotent', async () => {
  const first = await migrate(pool);
  assert.ok(first.length > 0);
  assert.deepEqual(await migrate(pool), []);
});

test('order lookup by email is case-insensitive', async () => {
  const c = await createCustomer(pool, 'Mia@Example.com', 'Mia');
  await pool.query(`INSERT INTO orders(customer_id, email, total_cents) VALUES ($1, 'Mia@Example.com', 1200)`, [c.id]);
  const rows = await findOrdersByEmail(pool, 'mia@example.COM');
  assert.equal(rows.length, 1);
});
