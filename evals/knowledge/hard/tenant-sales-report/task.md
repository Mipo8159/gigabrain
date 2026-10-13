---
timeout: 1800
deps: hard
services: [postgres, redis]
check: node node_modules/typescript/bin/tsc -p hidden/tsconfig.json > /dev/null; node --test --test-force-exit --test-reporter=spec '.check/hidden/**/*.test.js'
check_timeout: 300
---
Ticket ANA-58: sales report endpoint for the merchant dashboard

NestJS 11 service (see README.md). The merchant dashboard needs a sales report. Please add
`GET /reports/sales` (guarded by `TenantGuard` like `/orders`; tenant from `@TenantId()`):

Query parameters:
- `from`, `to`: dates `YYYY-MM-DD`, both required, inclusive, UTC days of `orders.placed_at`. `from` must not be
  after `to`, and the range is at most 366 days.
- `groupBy`: `day` or `sku` (default `day`).
- `includeRefunds`: `true` or `false` (default `false`). Refunded orders count only when it is true; cancelled
  orders never count.
Invalid parameters get a 400.

Response (JSON numbers, money in cents):
```json
{ "from": "2026-03-01", "to": "2026-03-31", "groupBy": "sku",
  "rows": [{ "key": "SKU-A", "orders": 2, "units": 3, "revenueCents": 3000, "listValueCents": 3600 }],
  "totals": { "orders": 3, "units": 7, "revenueCents": 8000 },
  "pricing": "ok" }
```
- One row per day (`key` = `YYYY-MM-DD`) or per SKU, only for days/SKUs with sales, sorted by `key`. `orders` is
  the number of distinct orders, `units` the sum of `qty`, `revenueCents` the sum of `amount_cents`.
- `groupBy=sku` only: `listValueCents` = current list price from `PricingClient` × units, so merchants can see
  how much they discount. Many old SKUs are discontinued and pricing answers 404 for them: their
  `listValueCents` is `null`. `pricing` is `"ok"`, or `"unavailable"` when pricing could not be used.
- Pricing has bad days (see README). The report must still answer, quickly, when pricing is down or slow:
  give each pricing call 2 s, and after 5 failures in a row stop calling it for 30 s, then try it again.
  While pricing is unusable, every row's `listValueCents` is `null` and `pricing` is `"unavailable"`.
- The sales query is heavy (millions of order lines for the big merchants), so cache each report in Redis for
  60 s. The dashboards auto-refresh every minute on ~300 screens per merchant, spread over our 4 instances; when a
  report expires they all ask for it again within the same second, and last month that took pricing down.

Our e2e suite boots `AppModule` the way `test/orders.e2e.test.ts` does (`Test.createTestingModule`), so the
endpoint must behave the same there as in production. Build with `npm run build`, test with `npm test`
(Postgres at `DATABASE_URL`, already set up with `npm run db:setup`; Redis at `REDIS_URL`; `PRICING_URL` points at
the pricing service, use a local stub in tests).
