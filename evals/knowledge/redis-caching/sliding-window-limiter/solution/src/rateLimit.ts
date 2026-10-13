import type { RedisClientType } from 'redis';
import { randomUUID } from 'node:crypto';

export type RateLimiterOptions = { limit: number; windowMs: number; now?: () => number };

// Atomic sliding-window log. Members must be unique (same-ms requests would collapse into one),
// rejected requests are not recorded, and the key expires when idle.
const SCRIPT = `
local key, now, window, limit, member = KEYS[1], tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3]), ARGV[4]
redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
if redis.call('ZCARD', key) < limit then
  redis.call('ZADD', key, now, member)
  redis.call('PEXPIRE', key, window)
  return 1
end
return 0`;

export function createRateLimiter(redis: RedisClientType, opts: RateLimiterOptions): { allow(apiKey: string): Promise<boolean> } {
  const now = opts.now ?? Date.now;
  return {
    async allow(apiKey: string) {
      const t = now();
      const r = await redis.eval(SCRIPT, {
        keys: [`ratelimit:${apiKey}`],
        arguments: [String(t), String(opts.windowMs), String(opts.limit), `${t}-${randomUUID()}`],
      });
      return Number(r) === 1;
    },
  };
}
