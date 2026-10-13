import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { REDIS, RedisClient } from '../redis/redis.module';

const RELEASE = `if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Redis cache with cross-instance single flight: on a miss one caller (on any instance) takes a short
 * lock and computes; everyone else waits for the value instead of recomputing.
 */
@Injectable()
export class ReportCache {
  private local = new Map<string, Promise<unknown>>();

  constructor(@Inject(REDIS) private readonly redis: RedisClient) {}

  getOrCompute<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
    const inflight = this.local.get(key);
    if (inflight) return inflight as Promise<T>;
    const p = this.load(key, ttlSeconds, compute).finally(() => this.local.delete(key));
    this.local.set(key, p);
    return p;
  }

  private async load<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
    const lockKey = `${key}:lock`;
    const deadline = Date.now() + 20_000;
    for (;;) {
      const hit = await this.redis.get(key);
      if (hit) return JSON.parse(hit) as T;
      const token = randomUUID();
      if ((await this.redis.set(lockKey, token, { NX: true, PX: 20_000 })) === 'OK') {
        try {
          const v = await compute();
          await this.redis.set(key, JSON.stringify(v), { EX: ttlSeconds });
          return v;
        } finally {
          await this.redis.eval(RELEASE, { keys: [lockKey], arguments: [token] }).catch(() => {});
        }
      }
      if (Date.now() > deadline) return compute();
      await sleep(40);
    }
  }
}
