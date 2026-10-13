---
timeout: 600
services: [postgres]
deps: postgres
---
We're moving tenant isolation into Postgres row-level security (see `db/schema.sql`: the policies read the
`app.tenant_id` setting). The app connects as the non-owner role `app_user`, so the policies apply to it.
Please implement `withTenant` in `src/tenant.ts` (`pg` is installed):

```ts
// Runs fn with a database client whose queries only see and write rows of `tenantId`.
// Everything fn does should be atomic: if fn throws, none of its writes stay.
export async function withTenant<T>(
  pool: pg.Pool,
  tenantId: number,
  fn: (db: pg.PoolClient) => Promise<T>,
): Promise<T>
```

Every request handler in the API (several instances, a shared `pg.Pool` each) will go through this, and
background jobs also use the same pool directly for cross-tenant maintenance queries that rely on seeing no
tenant rows unless they opt in. Add a test of your own if you like: `DATABASE_URL` points at a scratch
Postgres 17 database as a superuser (which bypasses RLS); see `db/README.md` for setting up `app_user` locally.
