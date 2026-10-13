import type { RedisClientType } from 'redis';

export type LockResult<T> = { acquired: false } | { acquired: true; value: T };

export async function withLock<T>(redis: RedisClientType, name: string, ttlMs: number, fn: () => Promise<T>): Promise<LockResult<T>> {
  throw new Error('not implemented');
}
