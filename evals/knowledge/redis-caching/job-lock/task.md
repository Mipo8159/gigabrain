---
timeout: 900
services: [redis]
deps: redis-caching
heldout: true
check: node --test --test-reporter=dot --test-timeout=10000 --test-force-exit 'hidden/**/*.test.*'
---
Our scheduled jobs (`src/jobs/`) run on every instance of the API (4 in production) and currently all of them
fire at once. We want a small Redis lock helper so each job runs on one instance at a time. Please implement
in `src/lock.ts`:

```ts
import type { RedisClientType } from 'redis';
export type LockResult<T> = { acquired: false } | { acquired: true; value: T };
// Runs fn only if this caller got the lock `name`; the lock auto-expires after ttlMs so a crashed
// instance can't block the job forever. Releases the lock when fn finishes (or throws; then rethrow).
export async function withLock<T>(redis: RedisClientType, name: string, ttlMs: number, fn: () => Promise<T>): Promise<LockResult<T>>
```

Then use it in `src/jobs/nightlyReport.ts`. Some jobs occasionally run longer than usual (slow upstream, GC
pauses), so don't assume fn always finishes within ttlMs. Redis is 8.10, client is node-redis `redis@6.3.0`.
`REDIS_URL` points at a scratch Redis; `npm test` runs `node --test`.
