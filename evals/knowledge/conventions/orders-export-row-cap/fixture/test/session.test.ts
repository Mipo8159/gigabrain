import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testConfig } from './helpers.ts';
import { issueSession, verifySession } from '../src/auth/session.ts';

test('session expires after SESSION_TTL_MINUTES', () => {
  testConfig({ SESSION_TTL_MINUTES: '10' });
  const c = issueSession('u1', 0);
  assert.equal(verifySession(c, 9 * 60_000), 'u1');
  assert.equal(verifySession(c, 10 * 60_000), null);
});

test('tampered cookie is rejected', () => {
  testConfig();
  const c = issueSession('u1', 0);
  assert.equal(verifySession(c.replace('u1', 'u2'), 1), null);
});
