import { log } from '../lib/log.ts';
import { verifyPassword } from '../lib/password.ts';
import { userStore } from '../users/store.ts';
import type { LoginResult } from './types.ts';

const authLog = log.child({ component: 'auth' });

export function login(email: string, password: string): LoginResult {
  const user = userStore.byEmail(email);
  if (!user) {
    authLog.info('auth.login_failed', { reason: 'unknown_email', email });
    return { ok: false, reason: 'invalid_credentials' };
  }
  if (!verifyPassword(password, user.passwordHash)) {
    authLog.info('auth.login_failed', { reason: 'bad_password', userId: user.id });
    return { ok: false, reason: 'invalid_credentials' };
  }
  authLog.info('auth.login_succeeded', { userId: user.id });
  return { ok: true, userId: user.id };
}
