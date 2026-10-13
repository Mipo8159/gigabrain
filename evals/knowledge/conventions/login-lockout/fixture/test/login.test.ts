import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { captureLogs } from '../src/lib/log.ts';
import { userStore } from '../src/users/store.ts';
import { registerUser } from '../src/users/register.ts';
import { login } from '../src/auth/login.ts';

beforeEach(() => userStore.clear());

test('right password logs in, wrong one does not', () => {
  const cap = captureLogs();
  const u = registerUser({ email: 'Ann@Example.com', name: 'Ann', password: 'correct horse' });
  assert.deepEqual(login('ann@example.com', 'correct horse'), { ok: true, userId: u.id });
  assert.deepEqual(login('ann@example.com', 'nope'), { ok: false, reason: 'invalid_credentials' });
  cap.stop();
  assert.ok(cap.entries.some((e) => e.msg === 'auth.login_failed'));
});

test('registration log does not contain the email', () => {
  const cap = captureLogs();
  registerUser({ email: 'bob@example.com', name: 'Bob', password: 'pw' });
  cap.stop();
  assert.ok(!JSON.stringify(cap.entries).includes('bob@example.com'));
});
