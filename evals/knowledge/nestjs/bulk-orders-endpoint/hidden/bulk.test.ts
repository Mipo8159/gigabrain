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

const order = (n: number, over: Record<string, unknown> = {}) => ({
  sku: `SKU-${n}`,
  qty: n,
  shipTo: { line1: `${n} Main St`, city: 'Berlin', country: 'DE' },
  ...over,
});
const count = async () => (await request(app.getHttpServer()).get('/orders').expect(200)).body.length;
const bulk = (body: unknown) => request(app.getHttpServer()).post('/orders/bulk').send(body as object);

const badBatches: Array<[string, unknown]> = [
  ['qty 0 in one item', [order(1), order(2, { qty: 0 }), order(3)]],
  ['qty as string', [order(1), order(2, { qty: 'many' })]],
  ['bad sku', [order(1, { sku: 'nope' })]],
  ['nested country invalid', [order(1), order(2, { shipTo: { line1: 'x', city: 'Paris', country: 'France' } })]],
  ['nested city missing', [order(1, { shipTo: { line1: 'x', country: 'FR' } })]],
  ['shipTo missing', [order(1, { shipTo: undefined })]],
  ['item not an object', [order(1), 'SKU-2']],
  ['empty array', []],
  ['not an array', order(1)],
];

for (const [label, body] of badBatches) {
  test(`rejects batch with ${label} and stores nothing`, async () => {
    const before = await count();
    await bulk(body).expect(400);
    assert.equal(await count(), before);
  });
}

test('valid batch is stored in input order', async () => {
  const before = await count();
  const res = await bulk([order(7), order(8), order(9)]).expect(201);
  assert.deepEqual(res.body.map((o: any) => o.sku), ['SKU-7', 'SKU-8', 'SKU-9']);
  assert.ok(res.body.every((o: any) => o.id !== undefined && o.shipTo.country === 'DE'));
  assert.equal(await count(), before + 3);
});

test('single POST /orders still validates nested address', async () => {
  await request(app.getHttpServer())
    .post('/orders')
    .send(order(1, { shipTo: { line1: 'x', city: 'Rome', country: 'Italy' } }))
    .expect(400);
});
