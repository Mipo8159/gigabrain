---
timeout: 900
deps: kafka
services: [kafka]
check: node --test --test-force-exit --test-reporter=dot 'hidden/**/*.test.*'
---
We're dropping kafkajs (unmaintained) for `@confluentinc/kafka-javascript` 1.11.0, which is already installed. `src/kafka.ts` already builds the shared Confluent client.

Please port `src/legacy/audit-kafkajs.ts` to `src/audit.ts`, using the shared `kafka` client from `src/kafka.ts`, with the same exported signature:

```ts
startAuditConsumer(opts: { topic: string; groupId: string; onEvent: (e: AuditEvent) => Promise<void> }): Promise<{ stop(): Promise<void> }>
```

Behaviour must stay the same as the legacy version:
- A brand-new group starts from the beginning of the topic (the archiver must see the full history on first deploy).
- No auto-commit: an event's offset is committed only after `onEvent` resolved for it.
- `stop()` disconnects cleanly.

A broker is available locally (`KAFKA_BROKERS`, default `localhost:9092`) if you want to try it. Leave the legacy file in place; we'll delete it in a follow-up.
