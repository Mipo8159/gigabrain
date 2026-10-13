import type { RedisClientType } from 'redis';

export type RateLimiterOptions = { limit: number; windowMs: number; now?: () => number };

export function createRateLimiter(redis: RedisClientType, opts: RateLimiterOptions): { allow(apiKey: string): Promise<boolean> } {
  throw new Error('not implemented');
}
