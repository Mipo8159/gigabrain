---
timeout: 600
deps: kafka
---
The outbox relay (`src/relay.ts`) is done except for the Kafka side. Please implement `createOutboxPublisher(kafka)` in `src/publisher.ts` (kafkajs 2.2.4):

```ts
createOutboxPublisher(kafka: Kafka): Promise<{ publish(rows: OutboxRow[]): Promise<string[]>; close(): Promise<void> }>
```

- `publish(rows)` gets unpublished outbox rows in id order (several aggregates mixed). Each row goes to `row.topic` with key `row.aggregateId`, value `row.payload` and an `event-type` header set to `row.eventType`.
- It resolves with the ids of the rows Kafka acknowledged; the relay marks exactly those as published and hands the rest back on the next tick (see `relayTick`). If Kafka is unavailable, `publish` should not throw; it just returns what made it.
- Downstream consumers (billing, shipping) rely on seeing each aggregate's events once and in order. We've had a few broker hiccups lately (leader elections during the 4.x upgrade), so this needs to hold up when sends fail or get retried.
- `close()` disconnects.

The tests in CI use a fake `Kafka` object (no broker), so stick to the public kafkajs producer API.
