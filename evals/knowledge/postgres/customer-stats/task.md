---
timeout: 600
services: [postgres]
deps: postgres
---
We need the numbers for the new customer header on the account page. Please implement
`customerStats(pool, customerId)` in `src/stats.ts` (schema is in `db/schema.sql`; `pg` is installed).

```ts
export async function customerStats(pool: pg.Pool, customerId: number): Promise<{
  orders: number;      // number of orders that are not cancelled
  itemsBought: number; // sum of quantity over the order items of those orders
  spent: string;       // sum of quantity * unit_price over those items, as a decimal string with 2 places, e.g. "1234.50"
  isRepeatCustomer: boolean; // true when orders > 1
}>
```

A customer with no orders should get zeros (`spent: "0.00"`). The frontend renders these values directly
and the analytics team consumes the same JSON, so the types matter. Add a test of your own if you like
(`DATABASE_URL` points at a scratch Postgres 17 database).
