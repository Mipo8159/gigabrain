---
timeout: 600
services: [postgres]
deps: postgres
heldout: true
---
We're replacing the Redis queue for thumbnail jobs with a Postgres table (`db/schema.sql`). Please implement
`claimJobs` in `src/queue.ts` (`pg` is installed; `completeJob` already exists):

```ts
export type Job = { id: number; payload: unknown; attempts: number };

// Claims up to `limit` pending jobs for `workerId`, oldest first: marks them running (locked_by, locked_at,
// attempts + 1) and returns them. Returns [] when nothing is pending.
export async function claimJobs(pool: pg.Pool, workerId: string, limit: number): Promise<Job[]>
```

The worker deployment runs 8 replicas, each polling in a loop. A job must never be processed by two
workers. Add a test of your own if you like (`DATABASE_URL` points at a scratch Postgres 17 database).
