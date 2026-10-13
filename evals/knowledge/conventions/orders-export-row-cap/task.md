---
timeout: 900
---
Ops asked for a cap on the orders CSV export: a few customers export years of orders and the
export worker runs out of memory.

Please implement `exportOrdersCsv` in `src/orders/export.ts`:

```ts
export function exportOrdersCsv(customerId: string): { csv: string; truncated: boolean }
```

- Header line `id,created_at,status,total`, then one line per order of that customer, newest first.
  `total` is the order total in major units with 2 decimals (`12.50`).
- At most `EXPORT_MAX_ROWS` orders (default 10000); `truncated` is true when orders were left out.
  Ops wants to tune the cap per environment without a deploy.

Add tests next to the existing ones if you like (`npm test`).
