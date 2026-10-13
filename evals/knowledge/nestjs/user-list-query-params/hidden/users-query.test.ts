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

const get = (qs: string) => request(app.getHttpServer()).get(`/users${qs}`);
const deactivated = [3, 6, 9, 12, 15, 18, 21, 24];

test('defaults: page 1, limit 20, both states', async () => {
  const res = await get('').expect(200);
  assert.equal(res.body.total, 25);
  assert.equal(Number(res.body.page), 1);
  assert.equal(Number(res.body.limit), 20);
  assert.deepEqual(res.body.items.map((u: any) => u.id), Array.from({ length: 20 }, (_, i) => i + 1));
});

test('active=false returns only deactivated users', async () => {
  const res = await get('?active=false').expect(200);
  assert.equal(res.body.total, 8);
  assert.deepEqual(res.body.items.map((u: any) => u.id), deactivated);
});

test('active=true returns only active users', async () => {
  const res = await get('?active=true&limit=100').expect(200);
  assert.equal(res.body.total, 17);
  assert.ok(res.body.items.every((u: any) => u.active === true));
});

test('page and limit slice after filtering', async () => {
  const res = await get('?active=false&page=2&limit=3').expect(200);
  assert.equal(res.body.total, 8);
  assert.equal(Number(res.body.page), 2);
  assert.equal(Number(res.body.limit), 3);
  assert.deepEqual(res.body.items.map((u: any) => u.id), [12, 15, 18]);
});

test('page past the end is empty, not an error', async () => {
  const res = await get('?page=9&limit=10').expect(200);
  assert.deepEqual(res.body.items, []);
  assert.equal(res.body.total, 25);
});

for (const qs of ['?page=0', '?page=-1', '?page=1.5', '?page=abc', '?limit=0', '?limit=101', '?limit=ten']) {
  test(`invalid paging ${qs} is a 400`, async () => {
    await get(qs).expect(400);
  });
}
