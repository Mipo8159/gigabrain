import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

const PW = 'tea kettle seven';

test('signup, login, me', async () => {
  const app = createApp();
  assert.equal((await app.handle('POST', '/signup', { email: 'Ann@x.test', password: PW })).status, 201);
  const { body } = await app.handle('POST', '/login', { email: 'ann@x.test', password: PW });
  const me = await app.handle('GET', '/me', {}, { sid: body.sid });
  assert.equal(me.body.email, 'ann@x.test');
});

test('weak password and bad login', async () => {
  const app = createApp();
  assert.equal((await app.handle('POST', '/signup', { email: 'b@x.test', password: 'short' })).status, 400);
  await app.handle('POST', '/signup', { email: 'b@x.test', password: PW });
  assert.equal((await app.handle('POST', '/login', { email: 'b@x.test', password: 'nope nope nope' })).status, 401);
});
