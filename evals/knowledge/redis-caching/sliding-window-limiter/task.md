---
timeout: 900
services: [redis]
deps: redis-caching
check: node --test --test-reporter=dot --test-timeout=10000 --test-force-exit 'hidden/**/*.test.*'
---
We need per-API-key rate limiting on the public API: at most `limit` requests in any rolling window of
`windowMs` milliseconds (a true sliding window, not fixed per-minute buckets: partners complained that
fixed buckets let 2x the limit through around the minute boundary). The API runs on several instances
behind a load balancer, so the state lives in Redis (8.10, node-redis `redis@6.3.0`).

Please implement in `src/rateLimit.ts`:

```ts
import type { RedisClientType } from 'redis';
export type RateLimiterOptions = { limit: number; windowMs: number; now?: () => number };
export function createRateLimiter(redis: RedisClientType, opts: RateLimiterOptions): {
  allow(apiKey: string): Promise<boolean>; // true = let the request through
};
```

`now` defaults to `Date.now`; use it as the clock for the window (our tests drive it). Clients that hit the
limit tend to retry in a tight loop, and partners have 10k+ API keys between them. It is called from
`src/middleware.ts` on every request. `REDIS_URL` points at a scratch Redis; `npm test` runs `node --test`.
