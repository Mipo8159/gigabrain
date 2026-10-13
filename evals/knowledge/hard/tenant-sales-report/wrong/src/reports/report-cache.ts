import { Inject, Injectable } from '@nestjs/common';
import { REDIS, RedisClient } from '../redis/redis.module';

/** Redis cache-aside; concurrent misses for the same key share one computation. */
@Injectable()
export class ReportCache {
  private inflight = new Map<string, Promise<unknown>>();

  constructor(@Inject(REDIS) private readonly redis: RedisClient) {}

  async getOrCompute<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
    const hit = await this.redis.get(key);
    if (hit) return JSON.parse(hit) as T;
    const running = this.inflight.get(key);
    if (running) return running as Promise<T>;
    const p = (async () => {
      const v = await compute();
      await this.redis.set(key, JSON.stringify(v), { EX: ttlSeconds });
      return v;
    })().finally(() => this.inflight.delete(key));
    this.inflight.set(key, p);
    return p;
  }
}
