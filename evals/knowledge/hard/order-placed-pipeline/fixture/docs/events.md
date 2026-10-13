# Order events (topic `orders.events`)

Key: the order id. Value: JSON `OrderEvent` (`src/orders/types.ts`):

```json
{ "type": "OrderPaid", "orderId": "…", "version": 2, "occurredAt": "2026-…Z", "order": { …OrderView… } }
```

- `version` is the order's `orders.version` after the change (1 when placed, +1 on every change).
- `order` is the full `OrderView` snapshot after the change.
- Consumers: billing, shipping, and our own read-model projector. Billing and shipping process the
  events of one order in order and only once; they rely on the key for partitioning.
