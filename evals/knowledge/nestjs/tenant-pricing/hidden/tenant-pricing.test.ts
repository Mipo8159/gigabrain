import 'reflect-metadata';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { RateTableSource } from '../src/pricing/rate-table.source';
import { exportPrices } from '../src/jobs/export-prices';

let app: INestApplication;
let loads = 0;

const TABLE = {
  prices: { 'SKU-A': 10, 'SKU-B': 2.5, 'SKU-C': 99.99 },
  tenants: { acme: 1, globex: 1.2, initech: 0.9 },
};

before(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(RateTableSource)
    .useValue({
      load: async () => {
        loads++;
        return structuredClone(TABLE);
      },
    })
    .compile();
  app = moduleRef.createNestApplication();
  await app.init();
});

after(async () => {
  await app.close();
});

test('price per tenant from X-Tenant', async () => {
  const server = app.getHttpServer();
  const acme = await request(server).get('/prices/SKU-A').set('X-Tenant', 'acme').expect(200);
  assert.equal(acme.body.price, 10);
  const globex = await request(server).get('/prices/SKU-A').set('X-Tenant', 'globex').expect(200);
  assert.equal(globex.body.price, 12);
  const initech = await request(server).get('/prices/SKU-C').set('X-Tenant', 'initech').expect(200);
  assert.equal(initech.body.price, 89.99);
});

test('missing or unknown tenant is a 400', async () => {
  const server = app.getHttpServer();
  await request(server).get('/prices/SKU-A').expect(400);
  await request(server).get('/prices/SKU-A').set('X-Tenant', 'umbrella').expect(400);
  await request(server).get('/cart/total?skus=SKU-A').expect(400);
});

test('cart total uses the tenant price', async () => {
  const res = await request(app.getHttpServer())
    .get('/cart/total?skus=SKU-A,SKU-B')
    .set('X-Tenant', 'globex')
    .expect(200);
  assert.equal(res.body.total, 15);
});

test('concurrent requests for different tenants do not mix', async () => {
  const server = app.getHttpServer();
  const tenants = ['acme', 'globex', 'initech', 'globex', 'acme', 'initech', 'globex', 'acme'];
  const expected: Record<string, number> = { acme: 12.5, globex: 15, initech: 11.25 };
  const results = await Promise.all(
    tenants.map((t) => request(server).get('/cart/total?skus=SKU-A,SKU-B').set('X-Tenant', t)),
  );
  results.forEach((r, i) => {
    assert.equal(r.status, 200);
    assert.equal(r.body.total, expected[tenants[i]], `tenant ${tenants[i]}`);
  });
});

test('export job prices for the given tenant', async () => {
  const out = await exportPrices(app, 'globex');
  assert.deepEqual(out, { 'SKU-A': 12, 'SKU-B': 3, 'SKU-C': 119.99 });
  const acme = await exportPrices(app, 'acme');
  assert.deepEqual(acme, { 'SKU-A': 10, 'SKU-B': 2.5, 'SKU-C': 99.99 });
});

test('rate table is loaded once per process', () => {
  assert.equal(loads, 1);
});
