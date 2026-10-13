import { log } from '../lib/log.ts';
import { userStore } from '../users/store.ts';

/** Support staff can view the app as a user. Every use is audited. */
export function startImpersonation(staffId: string, userId: string): { userId: string; staffId: string } {
  const user = userStore.get(userId);
  if (!user) throw new Error('no such user');
  log.warn('admin.impersonation_started', { staffId, user });
  return { userId, staffId };
}
