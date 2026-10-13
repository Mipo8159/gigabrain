import type { RedisClientType } from 'redis';

export type RateLimiterOptions = { limit: number; windowMs: number; now?: () => number };

// Sliding-window log in a sorted set (score = request time). Runs as one script so that
// concurrent instances can't both see "under the limit" and both add.
const SCRIPT = `
local key, now, window, limit = KEYS[1], tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3])
redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
if redis.call('ZCARD', key) < limit then
  redis.call('ZADD', key, now, ARGV[1])
  redis.call('PEXPIRE', key, window)
  return 1
end
return 0`;

export function createRateLimiter(redis: RedisClientType, opts: RateLimiterOptions): { allow(apiKey: string): Promise<boolean> } {
  const now = opts.now ?? Date.now;
  return {
    async allow(apiKey: string) {
      const result = await redis.eval(SCRIPT, {
        keys: [`ratelimit:${apiKey}`],
        arguments: [String(now()), String(opts.windowMs), String(opts.limit)],
      });
      return Number(result) === 1;
    },
  };
}
