import 'reflect-metadata';
import { after, before, test } from 'node:test';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

process.env.MAX_UPLOAD_MB = '25';
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

test('env var raises the cap: 20 MB is accepted', async () => {
  await upload(20 * 1024 * 1024).expect(201);
});

test('env var cap still applies: 26 MB is rejected', async () => {
  await upload(26 * 1024 * 1024).expect(413);
});
