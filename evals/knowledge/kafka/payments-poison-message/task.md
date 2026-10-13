---
timeout: 900
deps: kafka
services: [kafka]
check: node --test --test-force-exit --test-reporter=dot 'hidden/**/*.test.*'
---
The ledger consumer (`src/consumer.ts`, kafkajs) got wedged twice this week: the billing gateway sometimes emits payment events that are not valid JSON or fail validation (`parsePayment` throws `InvalidPaymentError` for those), and the consumer never got past them.

Please make `startPaymentsConsumer(opts)` robust. Keep its signature:

```ts
startPaymentsConsumer(opts: { topic: string; groupId: string; dlqTopic: string; apply: (p: PaymentEvent) => Promise<void> }): Promise<{ stop(): Promise<void> }>
```

- Events we can't parse/validate go to `opts.dlqTopic` following `docs/dlq.md`, and consumption carries on.
- `apply` writes to the ledger database. It throws when the database blips (failovers take a few seconds). Those payments are valid and must still be applied, not dropped or dead-lettered; payments for the same account must be applied in the order they were published (events are keyed by `accountId`).
- At-least-once is fine (`apply` is idempotent on `paymentId`).

A broker is available locally (`KAFKA_BROKERS`, default `localhost:9092`) if you want to try it.
