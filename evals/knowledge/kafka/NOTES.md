# Kafka: what the runs taught

## Baseline 2026-10-13 (vanilla Opus 5.5, write mode, 2 runs per case, real Kafka 4.3.1 broker)

**16 of 16.** Vanilla Claude handled string offsets (commit last processed + 1, using BigInt),
porting kafkajs options to the Confluent client, poison messages to a DLQ while transient errors
are retried in order, parking later events of a key behind a retry topic, an idempotent outbox
publisher that blocks its aggregate on failure, KIP-848 (`group.protocol=consumer`: client-side
session, heartbeat and assignor settings removed), replaying with `resetOffsets` instead of
`fromBeginning`, and leaving the group cleanly on SIGTERM during a rolling deploy.
Author's note: the KIP-848 and Confluent-port mistakes throw loudly at startup, so any agent
that runs its code self-corrects. Open-ended semantics (ordering, poison handling) also passed.
