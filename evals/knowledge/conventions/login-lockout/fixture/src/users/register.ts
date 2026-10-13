import { randomUUID } from 'node:crypto';
import { log } from '../lib/log.ts';
import { hashPassword } from '../lib/password.ts';
import { userStore, type User } from './store.ts';

export function registerUser(input: { email: string; name: string; password: string; phone?: string }): User {
  if (userStore.byEmail(input.email)) throw new Error('email already registered');
  const user: User = {
    id: `u_${randomUUID().slice(0, 8)}`,
    email: input.email.trim().toLowerCase(),
    name: input.name,
    phone: input.phone ?? null,
    passwordHash: hashPassword(input.password),
    createdAt: new Date().toISOString(),
    failedLogins: 0,
    lockedAt: null,
  };
  userStore.put(user);
  log.info('user.registered', { user });
  return user;
}
