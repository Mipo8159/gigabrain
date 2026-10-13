---
timeout: 900
services: [redis]
deps: redis-caching
check: node --test --test-reporter=dot --test-timeout=10000 --test-force-exit 'hidden/**/*.test.*'
---
When a tenant re-imports their catalog we have to drop everything we cached for them. All catalog
cache keys start with `catalog:<tenantId>:` (see `src/catalogCache.ts`). Please implement in
`src/invalidate.ts`:

```ts
import type { RedisClientType } from 'redis';
// Removes every key whose name starts with `prefix`. Resolves to the number of keys removed.
export async function invalidatePrefix(client: RedisClientType, prefix: string): Promise<number>
```

Context: this is the shared production Redis (8.x): around 20M keys, sessions and rate-limit counters live
there too, and a tenant usually has only a few hundred cached entries. We use node-redis (`redis@6.3.0`, already
installed). `REDIS_URL` points at a scratch Redis if you want to try things (`npm test` runs `node --test`).
