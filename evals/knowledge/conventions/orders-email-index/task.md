---
timeout: 900
services: [postgres]
deps: postgres
---
Support's order lookup by customer email (`findOrdersByEmail` in `src/orders/repo.ts`) has become
very slow: `orders` is ~40M rows in production and the query does a sequential scan. Please add an
index that this query can use.

`orders` takes writes all day (checkout), so the change must not block inserts or updates while it
builds. Schema changes ship as migrations; deploys apply them with `npm run migrate`.

`DATABASE_URL` points at a scratch Postgres 17 database if you want to try things out.
