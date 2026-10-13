---
timeout: 900
deps: typescript
check: npx tsc -p hidden/tsconfig.json && node --test --test-reporter=dot 'hidden/**/*.test.ts'
---
Order lookups are hammering Postgres. Put a read-through cache in front of `OrderRepo`.

Implement in `src/cached-orders.ts`:

```ts
export function createCachedOrders(kv: KV, repo: OrderRepo, opts?: { ttlSec?: number }): {
  get(id: string): Promise<Order | null>;
};
```

- `KV` (`src/kv.ts`) is our thin wrapper over Redis: string values, `get` returns `null` on a miss.
- Key format is `order:<id>`, TTL defaults to 300 s. The value is the order as JSON. The legacy PHP service reads and writes the same keys with the same JSON layout, so entries written by it can show up too.
- On a miss, load from the repo and cache it. Orders that don't exist return `null` (don't worry about caching misses).
- The cache must never make a lookup fail or return something wrong: if an entry can't be used, go to the database.

Callers use the `Order` type from `src/types.ts` as-is (they do date math on it). zod 4 is installed. `npm run typecheck` must stay clean.
