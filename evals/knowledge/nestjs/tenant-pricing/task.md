---
timeout: 900
deps: nestjs
heldout: true
check: node node_modules/typescript/bin/tsc -p hidden/tsconfig.json > /dev/null; node --test --test-reporter=dot '.check/hidden/**/*.test.js'
check_timeout: 240
---
Ticket TRK-170: per-tenant prices.

NestJS 11 service in `src/`. `PricingService` (`src/pricing/`) loads the rate table from `RateTableSource` once at startup and prices SKUs from it. It is used by `GET /prices/:sku`, by `CartService` (`GET /cart/total?skus=A,B`) and by the nightly export job `exportPrices()` in `src/jobs/export-prices.ts`.

Prices now differ per tenant. The rate table already carries a multiplier per tenant (`tenants: { acme: 1, globex: 1.2, ... }`); a tenant's price is `round(base * multiplier, 2 decimals)`.

- HTTP: the tenant comes from the `X-Tenant` header on every request to `/prices` and `/cart`. Missing header or a tenant not in the table: 400.
- The export job prices for the tenant it is given: change it to `exportPrices(app: INestApplicationContext, tenant: string): Promise<Record<string, number>>` (SKU to price, for every SKU in the table).
- More tenant-dependent logic (discounts, tax) is coming, so it would be nice if services could get at the current tenant without every caller having to pass it down by hand.
- The rate table is big and comes from a slow upstream: it must still be loaded once per process, not per request.

Add e2e tests in `test/` (boot `AppModule` via `Test.createTestingModule`, as in `test/health.e2e.test.ts`). Build with `npm run build`, test with `npm test`.
