import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { FakeClock, useClock, DAY, HOUR } from '../src/lib/clock.ts';
import { createSession, touchSession } from '../src/auth/sessions.ts';
import { issueResetToken, consumeResetToken } from '../src/auth/passwordReset.ts';
import { TokenExpiredError, UnauthorizedError } from '../src/errors.ts';

let restore = () => {};
afterEach(() => restore());

test('session slides while used and expires after 14 idle days', () => {
  const c = new FakeClock('2030-03-01T09:00:00Z');
  restore = useClock(c);
  const s = createSession('u1');
  c.advance(10 * DAY);
  touchSession(s.token);
  c.advance(13 * DAY);
  touchSession(s.token);
  c.advance(14 * DAY + 1);
  assert.throws(() => touchSession(s.token), UnauthorizedError);
});

test('reset token is valid for one hour', () => {
  const c = new FakeClock();
  restore = useClock(c);
  const t = issueResetToken('u1');
  c.advance(HOUR + 1);
  assert.throws(() => consumeResetToken(t.token), TokenExpiredError);
});
