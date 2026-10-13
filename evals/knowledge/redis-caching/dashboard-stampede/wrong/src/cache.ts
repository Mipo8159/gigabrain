import type { RedisClientType } from 'redis';

// Callers that miss while a computation for the same key is already running share its result.
const inflight = new Map<string, Promise<unknown>>();

export async function getOrCompute<T>(redis: RedisClientType, key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
  const hit = await redis.get(key);
  if (hit !== null) return JSON.parse(hit) as T;

  const running = inflight.get(key) as Promise<T> | undefined;
  if (running) return running;

  const p = (async () => {
    const value = await compute();
    await redis.set(key, JSON.stringify(value), { expiration: { type: 'EX', value: ttlSeconds } });
    return value;
  })().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}
