import type { RedisClientType } from 'redis';
import { randomUUID } from 'node:crypto';

export type LockResult<T> = { acquired: false } | { acquired: true; value: T };

export async function withLock<T>(redis: RedisClientType, name: string, ttlMs: number, fn: () => Promise<T>): Promise<LockResult<T>> {
  const key = `lock:${name}`;
  const token = randomUUID();

  const acquired = await redis.set(key, token, { condition: 'NX', expiration: { type: 'PX', value: ttlMs } });
  if (acquired === null) return { acquired: false };

  try {
    return { acquired: true, value: await fn() };
  } finally {
    // Only release the lock if we still own it; it may have expired and been taken by another instance.
    if ((await redis.get(key)) === token) {
      await redis.del(key);
    }
  }
}
