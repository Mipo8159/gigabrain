# orders-service

Owns orders: placing, paying, and the order page the mobile app polls.

- Node 24, TypeScript run directly (type stripping: no enums, no parameter properties, `import type`).
- Postgres is the source of truth. Every state change writes an event to the `outbox` table in the
  same transaction (`enqueue` in `src/outbox/outbox.ts`); the relay publishes the outbox to Kafka.
- The order page reads a Redis read model (`order:view:<id>`) that the projector keeps up to date
  from the order events.
- Deployed as 3 replicas behind the load balancer. Every replica runs the HTTP API, the outbox relay
  and the projector (`src/main.ts`). There is no leader election.

## Local dev

    DATABASE_URL=... REDIS_URL=... KAFKA_BROKERS=localhost:9092 npm start
    npm test

Tests talk to the real Postgres / Redis / Kafka from the env. The Kafka broker is shared: prefix
topic and group names in tests with `KAFKA_PREFIX` plus something unique.

Events: see `docs/events.md`.
