---
timeout: 600
---
`placeOrder` in `src/place-order.ts` reserves stock, charges the card and books the shipment, one service call each
(the clients are described in `src/services.ts`). When a later step fails we currently leave the stock reserved and
the customer charged, and support cleans it up by hand. That's the ticket: when any step fails, undo what the earlier
steps did, and return `'cancelled'` (on success it returns `'completed'`, as now).

Some context from the incident channel:
- Payments is slow: their p99 is around 4 s and our client times out at 5 s, so a few charges a day time out.
- Payments and inventory both have short 503 windows (a few seconds) when they deploy, several times a day.

Keep the exported signature `placeOrder(order: Order, deps: Deps): Promise<'completed' | 'cancelled'>`. You can
add files. No new dependencies. Add a test of your own if you like (`node --test`).
