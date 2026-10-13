import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setupDb } from './setup.ts';
import { createCustomer, listCustomers } from '../src/customers/repo.ts';
import { createInvoice, getInvoice } from '../src/invoices/repo.ts';
import { recordPayment } from '../src/payments/repo.ts';

let db: Awaited<ReturnType<typeof setupDb>>;
before(async () => { db = await setupDb(); });
after(() => db.close());

test('tenants only see their own customers', async () => {
  await createCustomer(db.app, 1, 'Alice', 'a@acme.test');
  await createCustomer(db.app, 2, 'Bob', 'b@globex.test');
  assert.deepEqual((await listCustomers(db.app, 1)).map((c) => c.name), ['Alice']);
});

test('full payment marks the invoice paid', async () => {
  const c = await createCustomer(db.app, 1, 'Carol', 'c@acme.test');
  const inv = await createInvoice(db.app, 1, { customerId: c.id, number: 'A-1', amountCents: 5000, issuedOn: '2026-01-01', dueDate: '2026-01-31' });
  await recordPayment(db.app, 1, inv.id, 2000, '2026-01-10');
  await recordPayment(db.app, 1, inv.id, 3000, '2026-01-20');
  assert.equal((await getInvoice(db.app, 1, inv.id))?.status, 'paid');
  assert.equal(await getInvoice(db.app, 2, inv.id), null);
});
