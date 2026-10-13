---
timeout: 600
---
The activity feed needs paging. Implement `listEvents(db, opts)` in `src/events.ts`; the HTTP handler
(`GET /events?limit=&cursor=`) already calls it and passes the result straight through as JSON.

```ts
export function listEvents(
  db: DatabaseSync,                       // node:sqlite, schema in src/db.ts
  opts: { limit: number; cursor?: string | null },
): { items: EventRow[]; nextCursor: string | null }
```

- Newest first (`created_at` descending).
- First page: no cursor. Next page: the client sends back the `nextCursor` it got. Treat the cursor as opaque
  to clients; the format is up to you.
- `nextCursor` is `null` when there is nothing more to fetch, so the client stops paging.
- Events keep being written while users scroll, so new rows can arrive between two page requests.

`src/db.ts` has the schema and an `openDb()` helper. Keep it dependency-free (Node 24, `node:sqlite`).
Add a test of your own if you like (`node --test`).
