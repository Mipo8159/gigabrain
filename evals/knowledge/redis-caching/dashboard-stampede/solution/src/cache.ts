import type { RedisClientType } from 'redis';
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';

const RELEASE = `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end`;
const LOCK_TTL_MS = 30_000;
const POLL_MS = 50;

// In-process single flight: concurrent callers on one instance share one promise.
const inflight = new Map<string, Promise<unknown>>();

export async function getOrCompute<T>(redis: RedisClientType, key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
  const hit = await redis.get(key);
  if (hit !== null) return JSON.parse(hit) as T;
  let p = inflight.get(key) as Promise<T> | undefined;
  if (!p) {
    p = fleetWide(redis, key, ttlSeconds, compute).finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return p;
}

// Across instances: one rebuilder holds a short lock; the others poll for the value.
async function fleetWide<T>(redis: RedisClientType, key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
  const lockKey = `${key}:rebuild-lock`;
  for (;;) {
    const hit = await redis.get(key);
    if (hit !== null) return JSON.parse(hit) as T;
    const token = randomUUID();
    const got = await redis.set(lockKey, token, { condition: 'NX', expiration: { type: 'PX', value: LOCK_TTL_MS } });
    if (got !== null) {
      try {
        const again = await redis.get(key); // filled between our miss and our lock
        if (again !== null) return JSON.parse(again) as T;
        const value = await compute();
        await redis.set(key, JSON.stringify(value), { expiration: { type: 'EX', value: ttlSeconds } });
        return value;
      } finally {
        await redis.eval(RELEASE, { keys: [lockKey], arguments: [token] });
      }
    }
    await sleep(POLL_MS);
  }
}
