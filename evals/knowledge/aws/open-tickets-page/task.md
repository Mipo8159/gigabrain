---
timeout: 600
deps: aws
---
The support dashboard needs a paged list of a tenant's open tickets. Please implement `listOpenTickets`
in `src/tickets.ts`.

```ts
export type Ticket = { tenantId: string; ticketId: string; subject: string; status: 'OPEN' | 'CLOSED' };

export async function listOpenTickets(
  tenantId: string,
  opts: { limit: number; cursor?: string },
): Promise<{ items: Ticket[]; nextCursor?: string }>;
```

- Table `TICKETS_TABLE`: partition key `pk` = `TENANT#<tenantId>`, sort key `sk` = `TICKET#<ticketId>`
  (ticket ids are time-ordered, so `sk` order is creation order). Other attributes: `ticketId`, `subject`, `status`.
  There is no index on `status`.
- Return open tickets oldest first, at most `limit` per page. `nextCursor` is opaque to the frontend; passing it
  back returns the next page. When there are no more open tickets, `nextCursor` is absent.
- Big tenants have ~200k tickets and nearly all of them are closed.

Use the DocumentClient in `src/db.ts`. AWS SDK v3 is installed; don't add dependencies. There's no AWS
account here. Add a test of your own if you like (`node --test`).
