---
timeout: 900
services: [redis]
deps: redis-caching
check: node --test --test-reporter=dot --test-timeout=10000 --test-force-exit 'hidden/**/*.test.*'
---
The dashboard summary query takes 5-10 s on the warehouse, so we cache its result for 5 minutes with
`getOrCompute` in `src/cache.ts` (used from the HTTP handlers in `src/routes.ts`). Every time the entry
expires, the warehouse gets hit by the same query dozens of times at once: every open dashboard on all
8 API instances misses at the same moment and recomputes it. Last week that took the warehouse down.

Please change `getOrCompute` so that for a given key only one computation runs at a time across all
instances, and every other caller gets the result of that computation. Keep the signature:

```ts
export async function getOrCompute<T>(redis: RedisClientType, key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T>
```

Values are JSON-serialisable. Redis is 8.10, client is node-redis `redis@6.3.0`. `REDIS_URL` points at a
scratch Redis; `npm test` runs `node --test`.
