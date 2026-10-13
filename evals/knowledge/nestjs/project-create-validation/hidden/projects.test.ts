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

test('valid project is created and listed', async () => {
  const res = await request(app.getHttpServer())
    .post('/projects')
    .send({ name: 'Website', key: 'WEB', description: 'Marketing site' })
    .expect(201);
  assert.equal(res.body.name, 'Website');
  assert.equal(res.body.key, 'WEB');
  assert.ok(res.body.id !== undefined);
  const list = await request(app.getHttpServer()).get('/projects').expect(200);
  assert.ok(list.body.some((p: any) => p.key === 'WEB'));
});

test('description is optional', async () => {
  await request(app.getHttpServer()).post('/projects').send({ name: 'Ops', key: 'OPS' }).expect(201);
});

const invalid: Array<[string, unknown]> = [
  ['missing name', { key: 'ABC' }],
  ['empty name', { name: '', key: 'ABC' }],
  ['name not a string', { name: 42, key: 'ABC' }],
  ['missing key', { name: 'No key' }],
  ['lowercase key', { name: 'Bad key', key: 'abc' }],
  ['key too long', { name: 'Bad key', key: 'ABCDEF' }],
  ['description not a string', { name: 'Desc', key: 'DSC', description: 7 }],
];

for (const [label, body] of invalid) {
  test(`rejects ${label} with 400`, async () => {
    await request(app.getHttpServer()).post('/projects').send(body as object).expect(400);
  });
}

test('rejected bodies are not stored', async () => {
  const list = await request(app.getHttpServer()).get('/projects').expect(200);
  assert.ok(!list.body.some((p: any) => p.key === 'abc' || p.key === 'ABCDEF' || p.name === 42));
});
