---
timeout: 900
deps: kafka
services: [kafka]
check: node --test --test-force-exit --test-reporter=dot 'hidden/**/*.test.*'
---
Platform finished moving our clusters to Kafka 4.3. Every deploy of shipment-tracker (12 pods) still causes a stop-the-world rebalance where all partitions pause for several seconds.

Please switch `startShipmentConsumer` in `src/consumer.ts` to the new consumer group protocol from KIP-848, which Kafka 4.x supports, so rebalances become incremental. Keep the function's signature and behaviour otherwise (same group, starts from the beginning for a new group, same handler).

We use `@confluentinc/kafka-javascript` 1.11.0. A Kafka 4.3 broker is available locally (`KAFKA_BROKERS`, default `localhost:9092`) if you want to try it.
