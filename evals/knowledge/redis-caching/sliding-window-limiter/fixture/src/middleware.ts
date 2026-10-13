import type { IncomingMessage, ServerResponse } from 'node:http';
import type { RedisClientType } from 'redis';
import { createRateLimiter } from './rateLimit.ts';

export function rateLimitMiddleware(redis: RedisClientType) {
  const limiter = createRateLimiter(redis, { limit: 100, windowMs: 60_000 });
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const apiKey = String(req.headers['x-api-key'] ?? 'anonymous');
    if (await limiter.allow(apiKey)) return next();
    res.statusCode = 429;
    res.end('rate limited');
  };
}
