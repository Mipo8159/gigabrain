---
timeout: 600
deps: aws
heldout: true
---
We're replacing the cron that emails order updates with EventBridge. The outbox relay reads up to 100 pending
rows from Postgres and calls `publishOrderEvents` with them; it marks as sent exactly the rows that this
function reports as published, and leaves the rest for the next run. Please implement it in `src/events.ts`.

```ts
export type OrderEvent = { id: string; type: 'OrderPlaced' | 'OrderShipped' | 'OrderCancelled'; orderId: string; payload: Record<string, unknown> };
export async function publishOrderEvents(events: OrderEvent[]): Promise<{ published: string[]; failed: string[] }>;
```

- Put each event on the bus named by `ORDER_EVENTS_BUS`, `Source: "shop.orders"`, `DetailType` = the event's `type`,
  `Detail` = JSON of `{ id, orderId, ...payload }`.
- `published` / `failed` are event ids; every input id ends up in exactly one of them.
- Downstream consumers (email, loyalty points) are not idempotent, so an event should reach the bus once.
- The bus is shared with other teams and does get throttled at peak.

Use the client in `src/eventbridge.ts`. AWS SDK v3 is installed; don't add dependencies. There's no AWS account
here. Add a test of your own if you like (`node --test`).
