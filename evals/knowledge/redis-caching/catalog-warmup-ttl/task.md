---
timeout: 900
services: [redis]
deps: redis-caching
check: node --test --test-reporter=dot --test-timeout=10000 --test-force-exit 'hidden/**/*.test.*'
---
`src/productCache.ts` has our read-through product cache (node-redis `redis@6.3.0`). Two methods are still stubs;
please implement them:

- `update(id, patch)`: write the change to the repository, then refresh the cached copy so the very next read is
  served from Redis with the new data (product pages are read right after an edit, and we don't want the miss).
- `warm(ids)`: preload the given products into the cache. It runs on every deploy for ~50k products, so keep the
  number of round trips to Redis small (batch it). Products that don't exist in the repository are skipped.

Don't change `get()` or the constructor signature: other services construct this class. `REDIS_URL` points at a
scratch Redis if you want to try things; `npm test` runs `node --test`.
