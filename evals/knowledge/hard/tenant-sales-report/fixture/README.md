# analytics-api

Multi-tenant sales analytics behind the merchant dashboards. NestJS 11 (Express 5), Postgres 17, Redis 8.

- Every request carries `X-Tenant-Id`; `TenantGuard` checks it and `@TenantId()` reads it.
- Tenant data is isolated with Postgres row-level security. The app connects as the non-owner role
  `app_rw`, and every query must run inside `DbService.withTenant(tenantId, fn)`, which sets
  `app.tenant_id` for that transaction only. Outside it, RLS returns no rows.
- List prices come from the pricing service (`PricingClient`). It's another team's service and it has
  bad days: it goes down or gets very slow for minutes at a time.
- Production: 4 instances behind the load balancer, one Redis, one Postgres primary.

## Dev

    npm run db:setup     # schema + app_rw role into $DATABASE_URL (superuser URL)
    npm run build && npm test

The app itself must use the `app_rw` URL; `test/helpers.ts` derives it from `DATABASE_URL`.
