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
  const { ApiKeyGuard } = await import('../src/auth/api-key.guard');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ApiKeyGuard)
    .useValue({ canActivate: () => true })
    .compile();
  app = moduleRef.createNestApplication();
  await app.init();
});

after(async () => {
  await app.close();
});

test('overridden guard lets requests without a key through', async () => {
  const res = await request(app.getHttpServer()).get('/projects').expect(200);
  assert.equal(res.body.length, 2);
  await request(app.getHttpServer()).get('/projects/2').expect(200);
});
