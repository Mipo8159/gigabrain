// Hidden tests for ANA-58. Happy paths first, then one test per trap (named "trap: ...").
import 'reflect-metadata';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Pool } from 'pg';
import { createClient } from 'redis';

const SUPER_URL = process.env.DATABASE_URL!;
const appUrl = (() => { const u = new URL(SUPER_URL); u.username = 'app_rw'; u.password = 'app_rw'; return u.toString(); })();
const admin = new Pool({ connectionString: SUPER_URL, max: 3 });

// Pricing stub: list prices for a few SKUs, 404 for the rest; can be "down" (503) and slow.
const PRICES: Record<string, number> = { 'SKU-A': 1200, 'SKU-B': 600, 'SKU-C': 1600 };
const stub = { down: false, delayMs: 0, calls: [] as string[] };
let pricingServer: Server;

const apps: INestApplication[] = [];
async function boot(): Promise<INestApplication> {
  const { AppModule } = await import('../src/app.module');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  await app.init();
  apps.push(app);
  return app;
}
async function closeApp(app: INestApplication) {
  apps.splice(apps.indexOf(app), 1);
  await app.close();
}

async function seedOrder(tenantId: string, placedAt: string, status: string, lines: [string, number, number][]) {
  const o = await admin.query('INSERT INTO orders (tenant_id, placed_at, status) VALUES ($1, $2, $3) RETURNING id', [tenantId, placedAt, status]);
  for (const [sku, qty, amount] of lines) {
    await admin.query('INSERT INTO order_lines (tenant_id, order_id, sku, qty, amount_cents) VALUES ($1, $2, $3, $4, $5)',
      [tenantId, o.rows[0].id, sku, qty, amount]);
  }
}

let app: INestApplication;
const report = (a: INestApplication, tenant: string, qs: string) =>
  request(a.getHttpServer()).get(`/reports/sales?${qs}`).set('X-Tenant-Id', tenant);
const row = (body: any, key: string) => body.rows.find((r: any) => r.key === key);

before(async () => {
  pricingServer = createServer((req, res) => {
    const sku = decodeURIComponent((req.url ?? '').split('?')[0].split('/').pop() ?? '');
    stub.calls.push(sku);
    setTimeout(() => {
      if (stub.down) { res.writeHead(503); res.end('down'); return; }
      if (sku in PRICES) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ sku, listPriceCents: PRICES[sku] }));
      } else {
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'not priced' }));
      }
    }, stub.delayMs);
  });
  await new Promise<void>((r) => pricingServer.listen(0, '127.0.0.1', r));
  process.env.PRICING_URL = `http://127.0.0.1:${(pricingServer.address() as AddressInfo).port}`;
  process.env.DATABASE_URL = appUrl;

  await admin.query(`INSERT INTO tenants (id, name) VALUES ('t-acme', 'Acme'), ('t-globex', 'Globex'), ('t-refund', 'R'),
    ('t-stampede', 'S'), ('t-down', 'D') ON CONFLICT DO NOTHING`);
  await seedOrder('t-acme', '2026-03-01T09:00:00Z', 'paid', [['SKU-A', 2, 2000], ['SKU-B', 1, 500]]);
  await seedOrder('t-acme', '2026-03-01T23:30:00Z', 'paid', [['SKU-A', 1, 1000]]);
  await seedOrder('t-acme', '2026-03-02T12:00:00Z', 'refunded', [['SKU-B', 4, 2000]]);
  await seedOrder('t-acme', '2026-03-02T13:00:00Z', 'cancelled', [['SKU-A', 9, 9000]]);
  await seedOrder('t-acme', '2026-03-03T08:00:00Z', 'paid', [['SKU-C', 3, 4500]]);
  await seedOrder('t-acme', '2026-03-04T00:00:00Z', 'paid', [['SKU-C', 100, 99999]]); // outside the range
  await seedOrder('t-globex', '2026-03-01T10:00:00Z', 'paid', [['SKU-A', 50, 50000]]);
  for (let i = 1; i <= 8; i++) await seedOrder('t-acme', `2026-04-01T1${i % 10}:00:00Z`, 'paid', [[`OLD-${i}`, 1, 100 * i]]);
  await seedOrder('t-refund', '2026-03-01T10:00:00Z', 'paid', [['SKU-A', 1, 1000]]);
  await seedOrder('t-refund', '2026-03-02T10:00:00Z', 'refunded', [['SKU-B', 2, 2000]]);
  await seedOrder('t-stampede', '2026-05-01T10:00:00Z', 'paid', [['SKU-A', 1, 1100], ['SKU-B', 2, 1100], ['SKU-C', 3, 4700]]);
  await seedOrder('t-down', '2026-03-01T10:00:00Z', 'paid', [['SKU-A', 1, 1000], ['SKU-B', 1, 500]]);

  app = await boot();
});

after(async () => {
  for (const a of [...apps]) await a.close();
  await new Promise((r) => pricingServer.close(r));
  await admin.end();
});

test('happy: day report for the caller tenant, numbers as JSON numbers', async () => {
  const res = await report(app, 't-acme', 'from=2026-03-01&to=2026-03-03&groupBy=day').expect(200);
  const keys = ['key', 'orders', 'units', 'revenueCents'];
  assert.deepEqual(res.body.rows.map((r: any) => pick(r, keys)), [
    { key: '2026-03-01', orders: 2, units: 4, revenueCents: 3500 },
    { key: '2026-03-03', orders: 1, units: 3, revenueCents: 4500 },
  ]);
  assert.deepEqual(res.body.totals, { orders: 3, units: 7, revenueCents: 8000 });
  assert.equal(res.body.groupBy, 'day');
});
function pick(o: any, keys: string[]) { return Object.fromEntries(keys.map((k) => [k, o?.[k]])); }

test('happy: sku report with list values, and tenants never see each other', async () => {
  const acme = await report(app, 't-acme', 'from=2026-03-01&to=2026-03-03&groupBy=sku').expect(200);
  assert.equal(acme.body.pricing, 'ok');
  assert.deepEqual(row(acme.body, 'SKU-A'), { key: 'SKU-A', orders: 2, units: 3, revenueCents: 3000, listValueCents: 3600 });
  assert.deepEqual(row(acme.body, 'SKU-B'), { key: 'SKU-B', orders: 1, units: 1, revenueCents: 500, listValueCents: 600 });
  assert.deepEqual(row(acme.body, 'SKU-C'), { key: 'SKU-C', orders: 1, units: 3, revenueCents: 4500, listValueCents: 4800 });
  assert.deepEqual(acme.body.rows.map((r: any) => r.key), ['SKU-A', 'SKU-B', 'SKU-C']);
  const globex = await report(app, 't-globex', 'from=2026-03-01&to=2026-03-03&groupBy=sku').expect(200);
  assert.deepEqual(globex.body.rows, [{ key: 'SKU-A', orders: 1, units: 50, revenueCents: 50000, listValueCents: 60000 }]);
  assert.deepEqual(globex.body.totals, { orders: 1, units: 50, revenueCents: 50000 });
});

test('happy: pricing down, the report still answers without list values', async () => {
  const a = await boot();
  stub.down = true;
  try {
    const t0 = Date.now();
    const res = await report(a, 't-down', 'from=2026-03-01&to=2026-03-01&groupBy=sku').expect(200);
    assert.ok(Date.now() - t0 < 5000);
    assert.equal(res.body.pricing, 'unavailable');
    assert.ok(res.body.rows.length === 2 && res.body.rows.every((r: any) => r.listValueCents === null));
    assert.deepEqual(res.body.totals, { orders: 1, units: 2, revenueCents: 1500 });
  } finally {
    stub.down = false;
    await closeApp(a);
  }
});

test('trap: invalid parameters are a 400 in the e2e bootstrap', async () => {
  await report(app, 't-acme', 'from=2026-03-01&to=2026-03-03&groupBy=week').expect(400);
  await report(app, 't-acme', 'from=yesterday&to=2026-03-03').expect(400);
  await report(app, 't-acme', 'from=2026-03-01').expect(400);
  await report(app, 't-acme', 'from=2026-03-01&to=2026-03-03&includeRefunds=maybe').expect(400);
});

test('trap: includeRefunds=false leaves refunded orders out', async () => {
  const no = await report(app, 't-refund', 'from=2026-03-01&to=2026-03-02&includeRefunds=false').expect(200);
  assert.deepEqual(no.body.totals, { orders: 1, units: 1, revenueCents: 1000 }, 'includeRefunds=false counted the refunded order');
  const yes = await report(app, 't-refund', 'from=2026-03-01&to=2026-03-02&includeRefunds=true').expect(200);
  assert.deepEqual(yes.body.totals, { orders: 2, units: 3, revenueCents: 3000 });
  const dflt = await report(app, 't-refund', 'from=2026-03-01&to=2026-03-02').expect(200);
  assert.deepEqual(dflt.body.totals, { orders: 1, units: 1, revenueCents: 1000 });
});

test('trap: discontinued SKUs (404 from pricing) do not switch pricing off', async () => {
  const a = await boot();
  try {
    const old = await report(a, 't-acme', 'from=2026-04-01&to=2026-04-01&groupBy=sku').expect(200);
    assert.equal(old.body.rows.length, 8);
    assert.ok(old.body.rows.every((r: any) => r.listValueCents === null));
    assert.equal(old.body.pricing, 'ok', 'pricing answered every call (404 = not priced); it was usable');
    stub.calls.length = 0;
    const cur = await report(a, 't-acme', 'from=2026-03-01&to=2026-03-31&groupBy=sku').expect(200);
    assert.equal(cur.body.pricing, 'ok', 'after a report full of discontinued SKUs, pricing is treated as down');
    assert.equal(row(cur.body, 'SKU-A')?.listValueCents, 3600);
    assert.ok(stub.calls.includes('SKU-A'));
  } finally {
    await closeApp(a);
  }
});

test('trap: an expired report requested on all instances at once is computed once', async () => {
  const a2 = await boot();
  const redis = createClient({ url: process.env.REDIS_URL });
  await redis.connect();
  try {
    await redis.flushDb();
    stub.calls.length = 0;
    stub.delayMs = 300;
    const instances = [app, a2];
    const res = await Promise.all(Array.from({ length: 12 }, (_, i) =>
      report(instances[i % 2], 't-stampede', 'from=2026-05-01&to=2026-05-01&groupBy=sku')));
    assert.deepEqual(res.map((r) => r.status), Array(12).fill(200));
    for (const r of res) assert.equal(row(r.body, 'SKU-C')?.listValueCents, 4800);
    const per = (sku: string) => stub.calls.filter((c) => c === sku).length;
    assert.deepEqual({ A: per('SKU-A'), B: per('SKU-B'), C: per('SKU-C') }, { A: 1, B: 1, C: 1 },
      `pricing calls for one report requested 12 times on 2 instances: ${JSON.stringify(stub.calls)}`);
  } finally {
    stub.delayMs = 0;
    await redis.quit();
    await closeApp(a2);
  }
});
