import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

test('reset flow', async () => {
  let t = 0;
  const app = createApp({ now: () => t });
  await app.handle('POST', '/signup', { email: 'a@x.test', password: 'tea kettle seven' });
  assert.equal((await app.handle('POST', '/password-reset/request', { email: 'a@x.test' })).status, 202);
  const token = app.mailer.outbox[0].text.match(/token=([\w-]+)/)[1];
  assert.equal((await app.handle('POST', '/password-reset/confirm', { token, newPassword: 'kettle tea eight' })).status, 200);
  assert.equal((await app.handle('POST', '/password-reset/confirm', { token, newPassword: 'kettle tea eight' })).status, 400);
});
