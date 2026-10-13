import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type pg from 'pg';
import { testPool, seedSubscription } from './helpers.ts';
import { createAdminServer } from '../src/http/admin.ts';

let pool: pg.Pool;
before(async () => { pool = await testPool(); });
after(async () => { await pool.end(); });

test('admin: invoices of a subscription', async () => {
  const id = await seedSubscription(pool, { customerId: 'cus-admin', startedAt: '2026-01-10T10:00:00Z', nextBillAt: '2026-02-10T10:00:00Z' });
  const server = createAdminServer(pool);
  await new Promise<void>((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const r = await fetch(`${base}/subscriptions/${id}/invoices`);
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), []);
    assert.equal((await fetch(`${base}/subscriptions/999999/invoices`)).status, 404);
  } finally {
    server.close();
  }
});
