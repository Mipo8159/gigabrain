---
timeout: 1800
deps: hard
services: [postgres, redis, kafka]
check: node --test --test-force-exit --test-reporter=spec 'hidden/**/*.test.*'
check_timeout: 300
---
Ticket ORD-412: place orders + order page read model

Mobile checkout is moving to this service. It needs to place orders and then poll the order page until the
payment goes through. Repo: `orders-service` (see README.md). Please build these four pieces:

1. **`POST /orders`** in `src/orders/routes.ts`. Body `{ customerId, items: [{ sku, qty, unitPriceCents }] }`,
   validated with `parsePlaceOrder`. The `Idempotency-Key` header is required (400 without it). It creates the
   order (status `placed`, version 1, `totalCents` = sum of qty × unitPriceCents, items in `order_items`) and
   writes an `OrderPlaced` event to the outbox in the same transaction, the way `markOrderPaid` does. Respond
   201 with the `OrderView`.
   The app retries on timeouts and flaky mobile networks with the same key, so a retry must get the same order
   back and must never create a second order. Reusing a key with a different body is a client bug: 422.
2. **Outbox relay**: `relayOnce(pool, producer)` in `src/outbox/relay.ts` (kafkajs 2.2.4 `Producer`, already
   connected). Publish the unpublished outbox rows to their `topic`, key = `aggregate_id`, value = the payload
   JSON, mark them published (`published_at`) and resolve with how many were published. `startRelay` already
   calls it in a loop.
3. **Read model projector** in `src/projector/order-projector.ts`: `applyOrderEvent(redis, event)` keeps the
   order's `OrderView` (JSON) at `orderViewKey(orderId)` with `ORDER_VIEW_TTL_SECONDS`, and
   `startOrderProjector({ kafka, redis, topic, groupId })` consumes the order events into it (a new group starts
   from the beginning of the topic) and resolves once the consumer is running.
4. **`GET /orders/:id`**: serve the order page from the read model. On a miss, load the order from Postgres
   (`loadOrderView`), store it in the read model and return it. 404 for an unknown order.

Context:
- Production runs 3 replicas behind the load balancer, and each replica runs the API, the relay and the
  projector (`src/main.ts`). We have no leader election.
- Billing and shipping also consume `orders.events`; they handle each order's events in order and only once.
- The projector can fall behind (relay lag, consumer restarts and rebalances), and Kafka delivers at least once.
- After paying, customers keep refreshing the order page. Every time a page that showed "paid" shows "placed"
  again, support gets a ticket.

Keep the exported signatures in the stubs and `createApp({ pool, redis })`. You can add migrations
(`migrations/NNN_*.sql`, applied by `migrate()`). `npm test` runs `node --test`; Postgres, Redis and Kafka are
available at `DATABASE_URL`, `REDIS_URL` and `KAFKA_BROKERS`. The broker is shared, so name test topics and
groups with `KAFKA_PREFIX` plus something unique.
