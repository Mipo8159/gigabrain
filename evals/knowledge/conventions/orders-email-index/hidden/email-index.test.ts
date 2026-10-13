import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { migrate } from '../db/migrate.ts';
import { findOrdersByEmail } from '../src/orders/repo.ts';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
before(async () => { await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public'); });
after(() => pool.end());

test('the deploy step (the repo migration runner) applies every migration', async () => {
  await migrate(pool);
  assert.deepEqual(await migrate(pool), [], 'a second run must have nothing left to apply');
});

test('orders has a valid index on lower(email) that the lookup uses', async () => {
  const { rows } = await pool.query(`
    SELECT c.relname AS name, pg_get_indexdef(i.indexrelid) AS def, i.indisvalid AS valid
      FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
     WHERE i.indrelid = 'public.orders'::regclass`);
  const idx = rows.filter((r) => /lower\(\s*email\s*\)/i.test(r.def));
  assert.ok(idx.length >= 1, `no index on lower(email): ${JSON.stringify(rows.map((r) => r.def))}`);
  assert.ok(idx.some((r) => r.valid), 'index exists but is INVALID');

  await pool.query(`INSERT INTO customers(email, name) VALUES ('a@x.io', 'A')`);
  await pool.query(`INSERT INTO orders(customer_id, email, total_cents, created_at)
                    SELECT 1, 'user' || g || '@x.io', g, now() - g * interval '1 minute' FROM generate_series(1, 2000) g`);
  await pool.query('ANALYZE orders');
  const c = await pool.connect();
  try {
    await c.query('SET enable_seqscan = off');
    const plan = (await c.query(`EXPLAIN SELECT id FROM orders WHERE lower(email) = lower($1) ORDER BY created_at DESC LIMIT 50`, ['User7@x.io']))
      .rows.map((r) => r['QUERY PLAN']).join('\n');
    assert.ok(idx.some((r) => plan.includes(r.name)), `lookup does not use the index:\n${plan}`);
  } finally {
    c.release();
  }
  assert.equal((await findOrdersByEmail(pool, 'USER7@x.io')).length, 1);
});
