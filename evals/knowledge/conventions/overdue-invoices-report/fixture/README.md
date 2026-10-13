# ledger-api

Multi-tenant invoicing. Node 24 (TypeScript via type stripping), Postgres 17, `pg`.

## Tenancy

Every tenant-owned table has row-level security (`db/schema.sql`). The API connects as `app_user`,
which is not the table owner, so the policies always apply: a query only sees and writes rows of the
tenant set in `app.tenant_id` for the current transaction. Repositories run their SQL through
`withTenant(pool, tenantId, fn)` from `src/db/tenant.ts`, which opens the transaction and sets it.

## Tests

`npm test` needs `DATABASE_URL` (a superuser on a disposable database). `test/setup.ts` loads the
schema, creates `app_user` and returns a pool connected as it.
