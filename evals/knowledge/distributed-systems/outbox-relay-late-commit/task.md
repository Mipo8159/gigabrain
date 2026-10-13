---
timeout: 900
services: [postgres]
deps: distributed-systems
---
Orders and their events are written in one transaction (`placeOrder` in `src/orders.ts` inserts the order and an
outbox row via `enqueueEvent`). Nothing publishes the outbox yet. Please implement the relay in `src/relay.ts`:
`createRelay({ pool, publish, batchSize })` returns `{ pollOnce() }`, which publishes outbox events that haven't been
published yet and resolves to how many it published. A small loop in `src/main.ts` calls it every 200 ms.

Constraints:
- `publish(event)` sends to Kafka and resolves once the broker has acked. It can fail.
- The `outbox` table is append-only: the data team's CDC pipeline reads it and a retention job drops old partitions
  by `created_at`, so the relay must not UPDATE or DELETE outbox rows. You can add tables, and add columns with
  defaults, in `migrate()`.
- After a relay restart it must not republish everything. A few duplicates around a crash are fine (consumers dedupe
  on the event id), lost events are not.
- Checkout is high traffic: many order transactions insert into the outbox concurrently. One relay instance runs.
- Keep the signatures of `migrate`, `enqueueEvent` and `createRelay`. `DATABASE_URL` points at a Postgres 17 database.

Add a test of your own if you like (`node --test`).
