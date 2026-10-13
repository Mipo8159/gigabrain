import { log } from '../lib/log.ts';
import { verifyPassword } from '../lib/password.ts';
import { userStore } from '../users/store.ts';
import type { LoginResult } from './types.ts';

const authLog = log.child({ component: 'auth' });
const MAX_FAILED_LOGINS = 5;

export function login(email: string, password: string): LoginResult {
  const user = userStore.byEmail(email);
  if (!user) {
    authLog.info('auth.login_failed', { reason: 'unknown_email', email });
    return { ok: false, reason: 'invalid_credentials' };
  }
  if (user.lockedAt) {
    authLog.info('auth.login_failed', { reason: 'locked', userId: user.id });
    return { ok: false, reason: 'locked' };
  }
  if (!verifyPassword(password, user.passwordHash)) {
    const failedLogins = user.failedLogins + 1;
    authLog.info('auth.login_failed', { reason: 'bad_password', userId: user.id, failedLogins });
    if (failedLogins >= MAX_FAILED_LOGINS) {
      const locked = userStore.update(user.id, { failedLogins, lockedAt: new Date().toISOString() });
      authLog.warn('auth.account_locked', { userId: locked.id, user: locked });
    } else {
      userStore.update(user.id, { failedLogins });
    }
    return { ok: false, reason: 'invalid_credentials' };
  }
  if (user.failedLogins) userStore.update(user.id, { failedLogins: 0 });
  authLog.info('auth.login_succeeded', { userId: user.id });
  return { ok: true, userId: user.id };
}

export function unlockAccount(userId: string): void {
  const user = userStore.get(userId);
  if (!user) throw new Error('no such user');
  userStore.update(userId, { failedLogins: 0, lockedAt: null });
  authLog.info('auth.account_unlocked', { userId });
}
