import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

const OLD = 'tea kettle seven';
const NEW = 'kettle tea eight!';
async function setup() {
  const clock = { t: 1_000_000 };
  const app = createApp({ now: () => clock.t });
  await app.handle('POST', '/signup', { email: 'ann@x.test', password: OLD });
  const sid = (await app.handle('POST', '/login', { email: 'ann@x.test', password: OLD })).body.sid;
  return { app, clock, sid };
}
const tokenFrom = (app) => {
  const m = app.mailer.outbox.at(-1).text.match(/https:\/\/app\.example\.com\/reset\?token=([^\s&"'<>]+)/);
  assert.ok(m, 'reset link in the email');
  return decodeURIComponent(m[1]);
};

test('unknown and known emails get the same answer; only known gets mail', async () => {
  const { app } = await setup();
  const a = await app.handle('POST', '/password-reset/request', { email: 'nobody@x.test' });
  const b = await app.handle('POST', '/password-reset/request', { email: 'ann@x.test' });
  assert.equal(a.status, 202);
  assert.deepEqual(a, b);
  assert.equal(app.mailer.outbox.length, 1);
  assert.equal(app.mailer.outbox[0].to, 'ann@x.test');
});

test('reset sets the password, logs out sessions, token is single-use', async () => {
  const { app, sid } = await setup();
  await app.handle('POST', '/password-reset/request', { email: 'ann@x.test' });
  const token = tokenFrom(app);
  const r = await app.handle('POST', '/password-reset/confirm', { token, newPassword: NEW });
  assert.equal(r.status, 200);
  assert.equal((await app.handle('GET', '/me', {}, { sid })).status, 401);
  assert.equal((await app.handle('POST', '/login', { email: 'ann@x.test', password: OLD })).status, 401);
  assert.equal((await app.handle('POST', '/login', { email: 'ann@x.test', password: NEW })).status, 200);
  assert.equal((await app.handle('POST', '/password-reset/confirm', { token, newPassword: 'another one 123' })).status, 400);
});

test('expired after 30 minutes, weak password rejected, junk token rejected', async () => {
  const { app, clock } = await setup();
  await app.handle('POST', '/password-reset/request', { email: 'ann@x.test' });
  const token = tokenFrom(app);
  assert.equal((await app.handle('POST', '/password-reset/confirm', { token, newPassword: 'short' })).status, 400);
  assert.equal((await app.handle('POST', '/password-reset/confirm', { token: 'nope', newPassword: NEW })).status, 400);
  clock.t += 31 * 60 * 1000;
  assert.equal((await app.handle('POST', '/password-reset/confirm', { token, newPassword: NEW })).status, 400);
  assert.equal((await app.handle('POST', '/login', { email: 'ann@x.test', password: OLD })).status, 200);
});
