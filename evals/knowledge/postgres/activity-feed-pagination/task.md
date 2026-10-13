---
timeout: 600
services: [postgres]
deps: postgres
---
The activity feed endpoint needs real pagination (the mobile app does infinite scroll). Please implement
`listEvents` in `src/feed.ts` (schema in `db/schema.sql`, `pg` is installed):

```ts
export type FeedEvent = { id: number; tenantId: number; kind: string; createdAt: Date };

// Newest first. `cursor` is whatever the previous page returned as nextCursor (opaque to the client);
// omit it for the first page. nextCursor is null when there is nothing more to load.
export async function listEvents(
  pool: pg.Pool,
  tenantId: number,
  opts: { limit: number; cursor?: string | null },
): Promise<{ items: FeedEvent[]; nextCursor: string | null }>
```

Big tenants have tens of millions of events and new events keep arriving while people scroll. Events are
written in batches by the ingest job, which stamps every event in a batch with the same `created_at`.
Feel free to add a migration file under `db/` if you need one. Add a test of your own if you like
(`DATABASE_URL` points at a scratch Postgres 17 database).
