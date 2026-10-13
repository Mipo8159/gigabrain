import 'reflect-metadata';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Pool } from 'pg';
import { adminPool, appDatabaseUrl, seedOrder } from './helpers';

let app: INestApplication;
let admin: Pool;

before(async () => {
  admin = adminPool();
  await admin.query(`INSERT INTO tenants (id, name) VALUES ('t-orders-a', 'A'), ('t-orders-b', 'B') ON CONFLICT DO NOTHING`);
  await seedOrder(admin, 't-orders-a', '2026-02-01T10:00:00Z', 'paid', [['SKU-A', 1, 1000]]);
  await seedOrder(admin, 't-orders-b', '2026-02-01T11:00:00Z', 'paid', [['SKU-B', 1, 777]]);
  process.env.DATABASE_URL_SUPER ??= process.env.DATABASE_URL;
  process.env.DATABASE_URL = appDatabaseUrl(process.env.DATABASE_URL_SUPER);
  const { AppModule } = await import('../src/app.module');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  await app.init();
});

after(async () => {
  await app.close();
  await admin.end();
  process.env.DATABASE_URL = process.env.DATABASE_URL_SUPER;
});

test('GET /orders only shows the caller tenant', async () => {
  const res = await request(app.getHttpServer()).get('/orders').set('X-Tenant-Id', 't-orders-a').expect(200);
  assert.ok(res.body.length >= 1);
  assert.ok(res.body.every((o: any) => o.totalCents !== 777));
});

test('unknown tenant is 403, missing is 401', async () => {
  await request(app.getHttpServer()).get('/orders').set('X-Tenant-Id', 'nope').expect(403);
  await request(app.getHttpServer()).get('/orders').expect(401);
});

test('GET /health', async () => {
  await request(app.getHttpServer()).get('/health').expect(200);
});
