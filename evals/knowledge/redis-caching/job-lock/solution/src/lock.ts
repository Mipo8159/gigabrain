import type { RedisClientType } from 'redis';
import { randomUUID } from 'node:crypto';

export type LockResult<T> = { acquired: false } | { acquired: true; value: T };

const RELEASE = `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end`;

export async function withLock<T>(redis: RedisClientType, name: string, ttlMs: number, fn: () => Promise<T>): Promise<LockResult<T>> {
  const key = `lock:${name}`;
  const token = randomUUID(); // unique per acquisition
  const ok = await redis.set(key, token, { condition: 'NX', expiration: { type: 'PX', value: ttlMs } });
  if (ok === null) return { acquired: false };
  try {
    return { acquired: true, value: await fn() };
  } finally {
    // Atomic compare-and-delete: the lock may have expired and been taken by someone else.
    await redis.eval(RELEASE, { keys: [key], arguments: [token] });
  }
}
