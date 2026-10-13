import 'reflect-metadata';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

let app: INestApplication;

before(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  await app.init();
});

after(async () => {
  await app.close();
});

test('audit feed shows events recorded by orders, newest first, filterable', async () => {
  const server = app.getHttpServer();
  const a = await request(server).post('/orders').send({ sku: 'SKU-1', qty: 2 }).expect(201);
  const b = await request(server).post('/orders').send({ sku: 'SKU-2', qty: 1 }).expect(201);
  await request(server).post(`/orders/${a.body.id}/cancel`).expect(201);

  const all = await request(server).get('/audit/events').expect(200);
  assert.deepEqual(
    all.body.map((e: any) => e.type),
    ['order.cancelled', 'order.created', 'order.created'],
  );
  assert.equal(all.body[0].payload.orderId, a.body.id);
  assert.equal(all.body[1].payload.orderId, b.body.id);
  assert.ok(all.body[0].seq > all.body[1].seq);

  const cancelled = await request(server).get('/audit/events?type=order.cancelled').expect(200);
  assert.equal(cancelled.body.length, 1);
  assert.equal(cancelled.body[0].payload.orderId, a.body.id);
});
