import 'reflect-metadata';
import { after, before, test } from 'node:test';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

delete process.env.MAX_UPLOAD_MB;
let app: INestApplication;

before(async () => {
  // Imported after the environment is set, like a real process start.
  const { AppModule } = await import('../src/app.module');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  await app.init();
});

after(async () => {
  await app.close();
});

const upload = (sizeBytes: number) =>
  request(app.getHttpServer()).post('/attachments').send({ filename: 'report.pdf', sizeBytes });

test('default cap: 9 MB is accepted', async () => {
  await upload(9 * 1024 * 1024).expect(201);
});

test('default cap: exactly 10 MB is accepted', async () => {
  await upload(10 * 1024 * 1024).expect(201);
});

test('default cap: 11 MB is rejected', async () => {
  await upload(11 * 1024 * 1024).expect(413);
});
