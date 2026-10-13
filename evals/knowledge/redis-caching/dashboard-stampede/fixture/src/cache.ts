import type { RedisClientType } from 'redis';

export async function getOrCompute<T>(redis: RedisClientType, key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
  const hit = await redis.get(key);
  if (hit !== null) return JSON.parse(hit) as T;
  const value = await compute();
  await redis.set(key, JSON.stringify(value), { expiration: { type: 'EX', value: ttlSeconds } });
  return value;
}
