---
timeout: 900
services: [postgres]
deps: postgres
---
Finance wants a dunning list. Please implement `listOverdueInvoices` in `src/invoices/repo.ts`:

```ts
export async function listOverdueInvoices(
  pool: pg.Pool,
  tenantId: number,
  asOf: string,            // 'YYYY-MM-DD'
): Promise<OverdueInvoice[]>
```

`OverdueInvoice` is already declared in that file. Overdue means: status `open`, `due_date` before `asOf`,
and something still left to pay (`amount_cents` minus the payments recorded for it). Return the
outstanding amount and how many days overdue it is, oldest due date first, with the customer's name.

`DATABASE_URL` points at a scratch Postgres 17 database (superuser) if you want to try things out.
