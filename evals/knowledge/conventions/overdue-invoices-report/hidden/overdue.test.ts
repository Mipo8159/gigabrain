import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { listOverdueInvoices } from '../src/invoices/repo.ts';

// Production setup: the API's pool connects as app_user (RLS applies); the superuser only seeds data.
const admin = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const appUrl = new URL(process.env.DATABASE_URL!);
appUrl.username = 'app_user';
appUrl.password = 'app';
let app: pg.Pool;

before(async () => {
  await admin.query(`DO $$ BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN CREATE ROLE app_user LOGIN PASSWORD 'app'; END IF;
  END $$;`).catch(() => {});
  await admin.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT USAGE ON SCHEMA public TO app_user;');
  await admin.query(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  await admin.query(`
    INSERT INTO tenants VALUES (1, 'Acme'), (2, 'Globex');
    INSERT INTO customers(id, tenant_id, name, email) VALUES (1, 1, 'Alice', 'a@x'), (2, 1, 'Ann', 'b@x'), (3, 2, 'Zed', 'z@x');
    INSERT INTO invoices(id, tenant_id, customer_id, number, status, amount_cents, issued_on, due_date) VALUES
      (1, 1, 1, 'A-1', 'open', 10000, '2026-01-01', '2026-02-01'),   -- 4000 paid -> 6000 outstanding
      (2, 1, 2, 'A-2', 'open',  5000, '2026-01-15', '2026-01-20'),   -- oldest
      (3, 1, 1, 'A-3', 'open',  3000, '2026-02-01', '2026-03-10'),   -- due after asOf
      (4, 1, 2, 'A-4', 'open',  2000, '2026-01-01', '2026-02-10'),   -- fully paid but still open
      (5, 1, 1, 'A-5', 'void',  9000, '2026-01-01', '2026-01-05'),
      (6, 2, 3, 'G-1', 'open',  7000, '2026-01-01', '2026-01-10');   -- other tenant
    INSERT INTO payments(tenant_id, invoice_id, amount_cents, paid_on) VALUES
      (1, 1, 1500, '2026-02-05'), (1, 1, 2500, '2026-02-10'), (1, 4, 2000, '2026-02-01');
  `);
  app = new pg.Pool({ connectionString: appUrl.toString(), max: 3 });
});
after(async () => { await app?.end(); await admin.end(); });

test('lists the tenant\'s overdue invoices with outstanding amounts, oldest first', async () => {
  const rows = await listOverdueInvoices(app, 1, '2026-03-01');
  assert.deepEqual(rows.map((r) => r.number), ['A-2', 'A-1']);
  const [a2, a1] = rows;
  assert.equal(Number(a2.outstandingCents), 5000);
  assert.equal(Number(a1.outstandingCents), 6000);
  assert.equal(Number(a2.daysOverdue), 40);
  assert.equal(Number(a1.daysOverdue), 28);
  assert.equal(a1.customerName, 'Alice');
  assert.equal(a2.dueDate, '2026-01-20');
});

test('other tenant sees only its own', async () => {
  const rows = await listOverdueInvoices(app, 2, '2026-03-01');
  assert.deepEqual(rows.map((r) => r.number), ['G-1']);
});

test('nothing is overdue before the due dates', async () => {
  assert.deepEqual(await listOverdueInvoices(app, 1, '2026-01-20'), []);
});
