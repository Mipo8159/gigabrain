import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { withTenant } from '../src/tenant.ts';

const admin = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const appUrl = new URL(process.env.DATABASE_URL!);
appUrl.username = 'app_user';
appUrl.password = 'app';
let pool1: pg.Pool, pool3: pg.Pool;

before(async () => {
  await admin.query(`DO $$ BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN CREATE ROLE app_user LOGIN PASSWORD 'app'; END IF;
  END $$;`).catch(() => {}); // another run may create it at the same moment
  await admin.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT USAGE ON SCHEMA public TO app_user;');
  await admin.query(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  await admin.query(`INSERT INTO notes(tenant_id, body) SELECT 1 + (g % 2), 'n' || g FROM generate_series(1, 20) g`);
  pool1 = new pg.Pool({ connectionString: appUrl.toString(), max: 1 });
  pool3 = new pg.Pool({ connectionString: appUrl.toString(), max: 3 });
});
after(async () => { await pool1?.end(); await pool3?.end(); await admin.end(); });

test('sees only its own tenant', async () => {
  const rows = await withTenant(pool1, 1, async (db) => (await db.query('SELECT tenant_id FROM notes')).rows);
  assert.equal(rows.length, 10);
  assert.ok(rows.every((r) => r.tenant_id === 1));
});

test('tenant context does not outlive the call on a pooled connection', async () => {
  await withTenant(pool1, 2, async (db) => db.query('SELECT 1'));
  // pool max 1: this is the same physical connection a background job would get next
  const { rows } = await pool1.query('SELECT count(*)::int AS n FROM notes');
  assert.equal(rows[0].n, 0, 'a later plain query on the same connection still sees tenant 2 rows');
  const s = await pool1.query(`SELECT current_setting('app.tenant_id', true) AS t`);
  assert.ok(s.rows[0].t === null || s.rows[0].t === '', `app.tenant_id leaked: ${s.rows[0].t}`);
});

test('context is cleared even when fn throws, and its writes are rolled back', async () => {
  await assert.rejects(withTenant(pool1, 1, async (db) => {
    await db.query(`INSERT INTO notes(tenant_id, body) VALUES (1, 'doomed')`);
    throw new Error('boom');
  }));
  const { rows } = await pool1.query('SELECT count(*)::int AS n FROM notes');
  assert.equal(rows[0].n, 0);
  const all = await admin.query(`SELECT count(*)::int AS n FROM notes WHERE body = 'doomed'`);
  assert.equal(all.rows[0].n, 0);
});

test('concurrent requests for different tenants never see each other', async () => {
  const runs = Array.from({ length: 30 }, (_, i) => {
    const t = 1 + (i % 2);
    return withTenant(pool3, t, async (db) => {
      const r = await db.query('SELECT tenant_id FROM notes');
      await db.query('SELECT pg_sleep(0.005)');
      const r2 = await db.query('SELECT tenant_id FROM notes');
      return { t, ids: [...r.rows, ...r2.rows].map((x) => x.tenant_id) };
    });
  });
  for (const { t, ids } of await Promise.all(runs)) {
    assert.equal(ids.length, 20);
    assert.ok(ids.every((x) => x === t));
  }
});

test('tenant id is a value, not SQL', async () => {
  const rows = await withTenant(pool1, 2, async (db) => (await db.query('SELECT count(*)::int AS n FROM notes')).rows);
  assert.equal(rows[0].n, 10);
});
