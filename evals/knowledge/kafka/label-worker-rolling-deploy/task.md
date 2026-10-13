---
timeout: 900
deps: kafka
services: [kafka]
check: node --test --test-force-exit --test-reporter=dot 'hidden/**/*.test.*'
---
Please write the label-worker entrypoint, `src/worker.ts` (started as `node src/worker.ts`).

- Consume the topic named by `process.env.TOPIC` as consumer group `process.env.GROUP_ID`, using the shared Confluent client in `src/kafka.ts` (`@confluentinc/kafka-javascript` 1.11.0). A new group starts from the beginning of the topic.
- Each message value is a JSON `Shipment`; call `printLabel(shipment)` (`src/labels.ts`) for it. It's slow, up to a few seconds per label.
- Every print is a physical label, so a shipment must not be printed twice, and none may be skipped.
- It runs on Kubernetes as a Deployment with 2–6 replicas (HPA), rolled several times a day; `terminationGracePeriodSeconds` is 30. Partitions shouldn't sit idle during deploys; the warehouse notices within seconds when labels stop coming.

A broker is available locally (`KAFKA_BROKERS`, default `localhost:9092`) if you want to try it.
