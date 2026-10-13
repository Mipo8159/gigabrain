---
timeout: 900
services: [postgres]
deps: postgres
---
Customers should be able to cancel an order before it ships. Please implement `cancelOrder` in
`src/orders/cancel.ts`:

```ts
export async function cancelOrder(pool: pg.Pool, orderId: number): Promise<void>
```

- Only `pending` and `paid` orders can be cancelled; anything else (or an unknown id) throws
  `OrderStateError` from `src/orders/errors.ts`.
- Set the status to `cancelled` and put the ordered quantities back into `products.stock`.
- The warehouse and billing services need to hear about it: emit an `order.cancelled` event with
  `{ orderId, customerId, items: [{ sku, quantity }] }`.

`DATABASE_URL` points at a scratch Postgres 17 database if you want to try things out.
