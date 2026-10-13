import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, seedCustomer } from './helpers.ts';

let app: Awaited<ReturnType<typeof startTestApp>>;
before(async () => { app = await startTestApp(); });
after(async () => { await app.close(); });

test('healthz', async () => {
  const r = await fetch(`${app.base}/healthz`);
  assert.equal(r.status, 200);
});

test('customer lookup', async () => {
  await seedCustomer(app.pool, 'cust-health');
  const r = await fetch(`${app.base}/customers/cust-health`);
  assert.equal(r.status, 200);
  assert.equal((await r.json()).email, 'cust-health@example.com');
  assert.equal((await fetch(`${app.base}/customers/nobody`)).status, 404);
});
