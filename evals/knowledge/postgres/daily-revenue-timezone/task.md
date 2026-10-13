---
timeout: 600
services: [postgres]
deps: postgres
heldout: true
check: TZ=Asia/Tokyo node --test --test-reporter=dot 'hidden/**/*.test.*'
---
Merchants want a "revenue per day" chart on their dashboard. Please implement `dailyRevenue` in
`src/revenue.ts` (schema in `db/schema.sql`, `pg` is installed):

```ts
// One entry per calendar day from `from` to `to` inclusive (both 'YYYY-MM-DD'), oldest first, including
// days with no sales (totalCents 0). Days are the merchant's own calendar days.
export async function dailyRevenue(
  pool: pg.Pool,
  merchantId: number,
  from: string,
  to: string,
): Promise<Array<{ day: string /* 'YYYY-MM-DD' */; totalCents: number }>>
```

Only `paid` orders count. Merchants are all over the world (their IANA timezone is on the merchant row).
The API servers run in several regions, so don't assume anything about the server's local timezone.
Add a test of your own if you like (`DATABASE_URL` points at a scratch Postgres 17 database).
