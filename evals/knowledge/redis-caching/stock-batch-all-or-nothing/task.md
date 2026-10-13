---
timeout: 900
services: [redis]
deps: redis-caching
heldout: true
check: node --test --test-reporter=dot --test-timeout=10000 --test-force-exit 'hidden/**/*.test.*'
---
The warehouse management system posts stock adjustments to us in batches. Please implement
`applyAdjustments` in `src/stock.ts`:

```ts
import type { Redis } from 'ioredis';
export type Adjustment = { sku: string; warehouse: string; delta: number };
export async function applyAdjustments(redis: Redis, batchId: string, adjustments: Adjustment[]): Promise<void>
```

Stock lives in Redis as one hash per SKU: key `stock:<sku>`, field = warehouse code, value = units (see
`src/stockRead.ts`). Applying a batch adds each `delta` to its field and pushes `batchId` onto the list
`stock:journal`. A batch is all-or-nothing: if any part of it can't be applied, none of it may be, and the
returned promise must reject (the HTTP handler turns that into a 409 and the WMS resends the whole batch
later). We're still migrating off the v1 service and some keyspace leftovers from it are still around.

We use ioredis here (`ioredis@6.0.0`, Redis 8.10). `REDIS_URL` points at a scratch Redis; `npm test` runs
`node --test`.
