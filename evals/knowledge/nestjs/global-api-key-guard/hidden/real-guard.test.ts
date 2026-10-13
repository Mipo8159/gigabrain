import 'reflect-metadata';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

process.env.API_KEY = 'k-real-123';
let app: INestApplication;

before(async () => {
  const { AppModule } = await import('../src/app.module');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  await app.init();
});

after(async () => {
  await app.close();
});

test('health is public', async () => {
  await request(app.getHttpServer()).get('/health').expect(200);
});

test('missing key is rejected', async () => {
  await request(app.getHttpServer()).get('/projects').expect(401);
});

test('wrong key is rejected', async () => {
  await request(app.getHttpServer()).get('/projects/1').set('x-api-key', 'nope').expect(401);
});

test('right key passes', async () => {
  const res = await request(app.getHttpServer()).get('/projects').set('x-api-key', 'k-real-123').expect(200);
  assert.equal(res.body.length, 2);
});
