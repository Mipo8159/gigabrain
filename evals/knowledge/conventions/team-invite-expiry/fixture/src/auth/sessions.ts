import { clock, DAY } from '../lib/clock.ts';
import { newId, newToken } from '../lib/ids.ts';
import { Table } from '../lib/store.ts';
import { UnauthorizedError } from '../errors.ts';

export interface Session { id: string; token: string; userId: string; createdAt: string; expiresAt: string; lastSeenAt: string }

const SESSION_TTL = 14 * DAY;
export const sessions = new Table<Session>();

export function createSession(userId: string): Session {
  const now = clock.now();
  return sessions.insert({
    id: newId('ses'),
    token: newToken(),
    userId,
    createdAt: now.toISOString(),
    lastSeenAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_TTL).toISOString(),
  });
}

/** Resolves a session token; sliding expiry: each use extends it by the TTL. */
export function touchSession(token: string): Session {
  const [s] = sessions.find((x) => x.token === token);
  const now = clock.now();
  if (!s || new Date(s.expiresAt) <= now) throw new UnauthorizedError('session expired');
  return sessions.update(s.id, {
    lastSeenAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_TTL).toISOString(),
  });
}
