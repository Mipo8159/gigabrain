import 'reflect-metadata';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

let app: INestApplication;

before(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
});

after(async () => {
  await app.close();
});

const ids = (body: any[]) => body.map((t) => t.id).sort((a, b) => a - b);

test('no filter returns everything', async () => {
  const res = await request(app.getHttpServer()).get('/tickets').expect(200);
  assert.deepEqual(ids(res.body), [1, 2, 3, 4, 5, 6]);
});

test('filter[status]', async () => {
  const res = await request(app.getHttpServer()).get('/tickets?filter[status]=open').expect(200);
  assert.deepEqual(ids(res.body), [1, 4, 5]);
});

test('filter[assignee]', async () => {
  const res = await request(app.getHttpServer()).get('/tickets?filter[assignee]=ben').expect(200);
  assert.deepEqual(ids(res.body), [3, 4]);
});

test('both filters combine with AND', async () => {
  const res = await request(app.getHttpServer()).get('/tickets?filter[status]=closed&filter[assignee]=ana').expect(200);
  assert.deepEqual(ids(res.body), [6]);
});

test('URL-encoded brackets work too', async () => {
  const res = await request(app.getHttpServer()).get('/tickets?filter%5Bstatus%5D=in_progress').expect(200);
  assert.deepEqual(ids(res.body), [2]);
});

test('unknown status is a 400', async () => {
  await request(app.getHttpServer()).get('/tickets?filter[status]=done').expect(400);
});
