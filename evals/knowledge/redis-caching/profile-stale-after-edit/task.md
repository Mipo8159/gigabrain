---
timeout: 900
services: [redis]
deps: redis-caching
check: node --test --test-reporter=dot --test-timeout=10000 --test-force-exit 'hidden/**/*.test.*'
---
Support keeps getting tickets that after a user edits their profile, some pages keep showing the old display
name or avatar until the cache entry expires (30 minutes). It happens mostly at peak traffic, and we can't
reproduce it locally. The profile cache is `src/profileCache.ts`; the API runs on 6 instances behind a load
balancer, all sharing one Redis (8.10, node-redis `redis@6.3.0`). The database layer is `src/store.ts`.

Please fix it: once `update()` has resolved, no instance should serve the pre-edit profile from the cache.
Reads must stay cached (profile reads are ~95% of our Redis traffic), and keep the exported
`createProfileCache(redis, store, opts)` signature and the `get` / `update` methods as they are, because the
route handlers use them. `REDIS_URL` points at a scratch Redis; `npm test` runs `node --test`.
