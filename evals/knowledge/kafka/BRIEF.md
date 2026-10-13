# Kafka knowledge brief (slug: kafka)

Researched 2026-10-12. Clients: kafkajs 2.2.4 (frozen since Feb 2023) and
@confluentinc/kafka-javascript 1.11.0 (librdkafka-based, has a KafkaJS-compatible API).
Broker for tests: `apache/kafka:4.3.1` (KRaft, single node).

## Mental model

1. Kafka is an append-only log split into partitions. Ordering exists only inside one partition; the key picks the partition.
2. The key-to-partition map is `murmur2(keyBytes) & 0x7fffffff % partitionCount`. Change the partition count or the hash and the same key moves, and ordering for that key breaks.
3. A consumer group shares partitions among its members. Progress is one committed number per partition: the offset of the *next* message to read.
4. Delivery is at-least-once by default. If you crash after the side effect and before the commit, you see the message again. So every handler must be idempotent.
5. "Exactly-once" (transactions) only covers Kafka-to-Kafka: read, produce, commit offsets atomically. A database write or HTTP call inside the handler is outside it.
6. You cannot atomically write to Postgres and Kafka. The outbox (write the event row in the same DB transaction, relay it later) and the inbox (record handled event IDs in the same DB transaction as the effect) close that gap.
7. One bad message blocks its whole partition if the handler keeps throwing. A DLQ or parking strategy is part of the design, not an extra.
8. Rebalances happen when members join, leave or stall. Work in flight for a revoked partition can be duplicated. Kafka 4.x's new protocol (KIP-848, `group.protocol=consumer`) makes rebalances incremental and server-driven.
9. Retention deletes whole segments by time or size. Compaction keeps the latest value per key, and a `null` value (tombstone) deletes the key. Neither one is instant or exact.
10. Schemas evolve under a registry compatibility rule (default BACKWARD: new readers must read old data). That rule dictates who upgrades first.
11. In Node, offsets are strings (64-bit), header values are Buffers, and the two client libraries look the same but differ in where config goes and in defaults.

## Traps

### 1. Offset arithmetic on strings
- **Mistake:** `commitOffsets([{ topic, partition, offset: message.offset + 1 }])`. In both kafkajs and the Confluent KafkaJS API, `message.offset` is a string, so `'41' + 1` is `'411'`. That commits far ahead and silently skips messages. `Number(offset)` loses precision above 2^53.
- **Correct:** `(BigInt(message.offset) + 1n).toString()`. The committed offset is the *next* offset to read (last processed + 1). Committing `message.offset` itself replays the last message after a restart.
- **Source:** https://kafka.js.org/docs/consuming (manual commits; "1 is added to prevent that same message from being consumed again")
- **Testable how:** In-memory. A `nextCommitOffset(message)` helper plus a fake consumer that records commits. The hidden test feeds offsets `'41'` and `'9007199254740993'` and expects `'42'` and `'9007199254740994'`. A real-Kafka variant: process 3 messages with manual commit, restart the consumer, and assert no message is seen twice or skipped.
- **Likelihood an LLM gets it wrong:** high. Offsets look numeric in every example, and the `+ 1` string concatenation never raises a type error in loose code.

### 2. Header values are Buffers (and sometimes arrays)
- **Mistake:** `if (message.headers['event-type'] === 'OrderCreated')` or `JSON.parse(message.headers.meta)`. On the consumer side, header values arrive as `Buffer`. A repeated header key becomes an array (`Buffer[]`); the Confluent client's `#createHeaders` builds that array explicitly.
- **Correct:** Normalise once: `const v = h[k]; const s = Array.isArray(v) ? v.map(String) : v?.toString('utf8')`. Producers may send strings, but consumers always get Buffers.
- **Source:** https://kafka.js.org/docs/producing (header values) ; https://github.com/confluentinc/confluent-kafka-javascript/blob/master/lib/kafkajs/_consumer.js (`#createHeaders`)
- **Testable how:** In-memory. A router `routeMessage(msg)` that dispatches on the `event-type` header. Hidden tests pass `headers: { 'event-type': Buffer.from('OrderCreated') }` and a duplicated-key array case. A real-Kafka round trip also works.
- **Likelihood an LLM gets it wrong:** high. The producer API accepts strings, so the asymmetry is invisible when writing from memory.

### 3. Confluent client: KafkaJS options in the wrong place
- **Mistake:** Porting kafkajs code to `@confluentinc/kafka-javascript` as-is: `consumer.subscribe({ topics, fromBeginning: true })`, `consumer.run({ autoCommit: false, eachMessage })`, `producer.send({ acks, compression })`, `createPartitioner: ...`, or `transaction.sendOffsets({ consumerGroupId, topics })`.
- **Correct:** Put these in the constructor under `kafkaJS`: `kafka.consumer({ kafkaJS: { groupId, fromBeginning: true, autoCommit: false } })`. `acks`, `compression` and `timeout` go on the producer config. Custom partitioners are not supported. `sendOffsets({ consumer, topics })` takes the consumer object. In v1.11.0 the subscribe and run variants throw `KafkaJSError` with `ERR__INVALID_ARG`, `autoCommitThreshold` throws `ERR__NOT_IMPLEMENTED`, and `sendOffsets` with `consumerGroupId` throws.
- **Source:** https://github.com/confluentinc/confluent-kafka-javascript/blob/master/MIGRATION.md ; source `lib/kafkajs/_consumer.js` lines ~1507 and ~1566, `_producer.js` ~841
- **Testable how:** Real Kafka (apache/kafka). The task: "write a consumer with the Confluent client that replays the topic from the start and commits manually." The hidden test pre-produces 5 messages and asserts all 5 are consumed. The mistake throws at subscribe or run.
- **Likelihood an LLM gets it wrong:** high. Training data is dominated by kafkajs examples, and the Confluent API is intentionally lookalike.

### 4. `fromBeginning` / `auto.offset.reset` does not replay an existing group
- **Mistake:** Setting `fromBeginning: true` to "reprocess everything" for a group that already has committed offsets. Or the reverse: a test produces messages *before* the consumer first joins with the default `latest` reset, and they are never seen.
- **Correct:** Reset only applies when the group has no valid committed offset. To replay, use `admin.resetOffsets({ groupId, topic, earliest: true })` (group must be empty), `admin.setOffsets`, or `consumer.seek`. In tests, use `fromBeginning: true` with a fresh group ID, or produce after the group joins.
- **Source:** https://kafka.js.org/docs/consuming ("The consumer group will use the latest committed offset when starting to fetch messages"; fromBeginning applies only when the offset is invalid or undefined)
- **Testable how:** Real Kafka. Run 1 consumes and commits 3 messages. The task is to add a `replay()` function. The hidden test calls `replay()` and expects all 3 messages again under the same group ID.
- **Likelihood an LLM gets it wrong:** med. Well documented, but "fromBeginning means replay" is a strong intuitive misreading.

### 5. Throwing in the handler is an infinite, partition-blocking retry (poison pill)
- **Mistake:** `eachMessage: async ({ message }) => { handle(JSON.parse(message.value)) }` with no error policy. In `@confluentinc/kafka-javascript` 1.x, a throw makes the consumer `seek()` back to the same offset and redeliver it immediately, with no backoff and no limit (source comment: "The same message may be reprocessed"). In kafkajs it retries 5 times, then restarts the consumer (`restartOnFailure` defaults to `async () => true`) and fetches the same offset again. Either way the partition is stuck.
- **Correct:** Classify errors. For a permanent error (bad JSON, schema mismatch), produce to a DLQ topic with the original key, value and headers plus `dlq.original.topic/partition/offset/error` headers, `await` that send, *then* let the offset advance. For a transient error, use bounded retries with backoff (`consumer.pause([{topic, partitions:[p]}])` plus a timer and `resume`). If the DLQ produce fails, do not advance.
- **Source:** https://github.com/confluentinc/confluent-kafka-javascript/blob/master/lib/kafkajs/_consumer.js (`#messageProcessor`) ; https://kafka.js.org/docs/configuration (retry, restartOnFailure)
- **Testable how:** In-memory fake consumer with the kafkajs semantic (throw means redeliver), or real Kafka. Hidden test: messages `[good, '{not json', good]`. Expect both goods processed, exactly 1 DLQ record carrying the original offset header, the committed offset past the bad one, and the handler called on the bad message fewer than N times.
- **Likelihood an LLM gets it wrong:** high. LLMs usually add try/catch-log-and-continue (data loss, no DLQ) or rethrow (stuck partition), and rarely gate the commit on the DLQ ack.

### 6. Retry/DLQ that breaks per-key ordering
- **Mistake:** Sending a failed message for key K to a retry topic while later messages for K keep processing. You get `OrderCancelled` applied before `OrderCreated`. This is the Uber-style non-blocking retry topic, used where ordering matters.
- **Correct:** When ordering per key matters, once K is parked, also park every later K message (keep a "parked keys" set, persisted or in a compacted topic) until K's retry resolves. Otherwise use blocking retry on that partition. State the trade-off explicitly.
- **Source:** https://www.confluent.io/blog/error-handling-patterns-in-kafka/ (pattern 4: "Retain order with a retry topic" / parked keys)
- **Testable how:** In-memory. `processor.handle(msg)` with a fake retry sink. Hidden test: K1 fails transiently, K2 (same key) arrives, K1 retries OK. Assert the apply order is K1 then K2, and that other keys are not blocked.
- **Likelihood an LLM gets it wrong:** high. The standard retry-topic answer ignores ordering.

### 7. Inbox dedupe keyed on (partition, offset), or recorded outside the effect's transaction
- **Mistake:** Deduping on `topic-partition-offset`. An outbox relay re-publish or a producer retry without idempotence writes the *same event* at a *new offset*, so the duplicate passes. Another variant: inserting into `processed_events` in a separate transaction after the side effect, or checking `SELECT exists` then inserting (a race between two consumers after a rebalance).
- **Correct:** Dedupe on a producer-assigned event ID (a header or payload `eventId`). In one DB transaction: `INSERT INTO inbox(event_id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING 1`. If no row comes back, skip. Otherwise apply the effect, then `COMMIT`. Commit the Kafka offset after the DB commit.
- **Source:** https://microservices.io/patterns/communication-style/idempotent-consumer.html
- **Testable how:** Postgres 17 (docker). Hidden test: deliver the same `eventId` at offsets 5 and 9, plus a concurrent double delivery with `Promise.all`. Assert the balance changes once. A second case throws inside the effect after the inbox insert and asserts the event is *not* marked processed.
- **Likelihood an LLM gets it wrong:** med. The inbox idea is known, but offset-based keys and check-then-insert are common.

### 8. Outbox relay polling `WHERE id > $lastSeen` skips events
- **Mistake:** The relay polls `SELECT * FROM outbox WHERE id > $last ORDER BY id` and stores the max ID. Sequence values are assigned at insert, not at commit. If transaction A (id 10) commits after transaction B (id 11), the relay sees 11, moves past it, and loses 10 forever.
- **Correct:** Do one of these:
  - (a) Use a `published_at`/`status` column and select unpublished rows (`... WHERE published_at IS NULL ORDER BY id FOR UPDATE SKIP LOCKED` for a single relay; note SKIP LOCKED with several relays breaks per-aggregate order).
  - (b) Use a watermark below `pg_snapshot_xmin(pg_current_snapshot())` (store the `xid8` in the row).
  - (c) Use CDC/logical decoding (Debezium).
  Publish with the aggregate ID as the key, and mark the row published only after the producer ack.
- **Source:** https://event-driven.io/en/ordering_in_postgres_outbox/
- **Testable how:** Postgres 17 and an in-memory fake publisher. The hidden test opens tx A, inserts and holds it, has tx B insert and commit, runs `relay.tick()`, commits A, and runs `relay.tick()` again. Assert both events are published.
- **Likelihood an LLM gets it wrong:** high. "Poll by increasing ID" is the textbook outbox sketch, and the gap only shows up under concurrency.

### 9. Hand-rolled key→partition hashing that is not Java-compatible
- **Mistake:** Implementing "which partition does key X go to" (for routing, co-partitioning checks or a fake broker) with `Math.abs(murmur2(key)) % n`, a string hash on UTF-16 code units, or CRC32. Another variant: mixing producers with different partitioners. librdkafka's own default is `consistent_random` (CRC32). The Confluent KafkaJS API forces `murmur2_random`, but the node-rdkafka-style API does not, and kafkajs < 2.0 used `LegacyPartitioner`.
- **Correct:** Java's rule is `toPositive(murmur2(utf8Bytes)) % numPartitions`, where `toPositive(x) = x & 0x7fffffff`, not `Math.abs`. murmur2 uses seed `0x9747b28c`. Every producer writing the same keyed topic needs the same partitioner. In librdkafka-native config, set `partitioner: 'murmur2_random'`.
- **Source:** https://kafka.js.org/docs/producing (DefaultPartitioner Java-compatible since v2, LegacyPartitioner) ; https://github.com/confluentinc/confluent-kafka-javascript/blob/master/lib/kafkajs/_producer.js (`rdKafkaConfig['partitioner'] = 'murmur2_random'`) ; https://github.com/confluentinc/librdkafka/blob/master/CONFIGURATION.md (`partitioner` default `consistent_random`)
- **Testable how:** In-memory. Implement `partitionFor(key, n)`. The hidden test compares it against vectors generated from kafkajs `Partitioners.DefaultPartitioner` (or Java), including keys whose hash is negative and non-ASCII keys. Optional real-Kafka check: produce with the solution's chosen partition and confirm the kafkajs default lands on the same one.
- **Likelihood an LLM gets it wrong:** med. murmur2 is often remembered, but `Math.abs` and UTF-16 slips are common.

### 10. Tombstones and compacted topics
- **Mistake:** Emitting a delete as `value: JSON.stringify(null)` (the string `"null"`), `value: ''`, or `{deleted:true}`, then expecting compaction to drop the key. Another variant: producing a null *key* to a `cleanup.policy=compact` topic, which the broker rejects. A third: expecting compaction to have happened by test time, when the active segment is never compacted and `min.cleanable.dirty.ratio` and `delete.retention.ms` delay cleanup.
- **Correct:** A tombstone is `{ key, value: null }`. Compacted topics require a non-null key. Consumers must handle `message.value === null` (do not `JSON.parse(null.toString())`). Do not assert on compaction timing in tests. Assert on the latest-value-per-key projection instead.
- **Source:** https://kafka.apache.org/documentation/#compaction ; https://kafka.apache.org/documentation/#topicconfigs_cleanup.policy
- **Testable how:** In-memory for the serializer and projection: `toRecord(event)` for a delete, and a consumer-side `applyToTable(msg)` that removes the key on a null value. Real Kafka for the null-key rejection: create a compact topic, and the hidden test expects the publish of a keyless event to be refused before it is sent, or to surface the broker error.
- **Likelihood an LLM gets it wrong:** med. Tombstone = null is known, but JSON-serialising everything through one helper produces `"null"`.

### 11. Idempotent/ordered producer defaults differ by client
- **Mistake:** Assuming the Java 3.0+ default (`enable.idempotence=true`, `acks=all`) applies in Node. kafkajs defaults to `idempotent: false` with unbounded `maxInFlightRequests`, and the Confluent KafkaJS API also defaults to `idempotent: false`. Retries can then duplicate *and reorder* messages for one key. Firing `Promise.all(events.map(e => producer.send(...)))` for the same key adds reordering on top.
- **Correct:** For per-key order and no duplicates from retries:
  - Confluent: `kafkaJS: { idempotent: true }` (requires `maxInFlightRequests <= 5`), or librdkafka `enable.idempotence: true`.
  - kafkajs: `idempotent: true, maxInFlightRequests: 1` (its idempotent mode is marked experimental).
  - Send same-key events in one `send({ messages: [...] })` call or sequentially.
- **Source:** https://kafka.js.org/docs/producing ; https://github.com/confluentinc/confluent-kafka-javascript/blob/master/MIGRATION.md (idempotent default false, maxInFlightRequests ≤ 5)
- **Testable how:** Mostly a config/contract test, in-memory. The hidden test inspects the config object passed to a fake `kafka.producer()` factory and asserts idempotence on and in-flight within bounds. It also asserts that same-key sends are serialised (the fake producer resolves the second call first and checks call order). Real fault injection is not practical in a tiny project.
- **Likelihood an LLM gets it wrong:** med. Many LLMs assume "idempotence is default now", which is true only for the Java client.

### 12. Exactly-once read-process-write: wrong wiring
- **Mistake:** Using a transactional producer but leaving the consumer on `autoCommit: true` (offsets committed outside the transaction). Or committing offsets with `consumer.commitOffsets` after `transaction.commit()`. Or reusing one producer after `abort()` caused a fatal error. Or believing the DB write inside the loop is now exactly-once.
- **Correct:**
  - Consumer: `autoCommit: false` and `readUncommitted: false` (the default in both Node clients; Java's default is read_uncommitted).
  - Per batch: `const tx = await producer.transaction(); await tx.send(...); await tx.sendOffsets({ consumer, topics })` (Confluent) or `sendOffsets({ consumerGroupId, topics })` (kafkajs). Use next-offset semantics, then `await tx.commit()`, and `tx.abort()` on error.
  - On a fatal error (`error.fatal`, e.g. fenced), recreate the producer.
  - A stable `transactionalId` per instance fences zombies.
  - External side effects still need the inbox (trap 7).
- **Source:** https://kafka.js.org/docs/transactions ; https://github.com/confluentinc/confluent-kafka-javascript/blob/master/MIGRATION.md (sendOffsets takes the consumer; transactionalId implies idempotent; error.fatal/abortable)
- **Testable how:** Real Kafka. The pipeline reads `in`, writes `out`, and the handler throws on message #3 once. The hidden test uses a `readUncommitted: false` checker consumer on `out`. It asserts each input appears exactly once in `out` and that the group offset equals the input end offset. With the mistake, duplicates appear after the forced crash/restart.
- **Likelihood an LLM gets it wrong:** med-high. The API shapes differ between the two libs, and autoCommit is easy to leave on.

### 13. Long processing and rebalances: duplicates and lost membership
- **Mistake:** Doing slow work per batch without heartbeating or re-checking ownership. With kafkajs `eachBatch`, never calling `heartbeat()` or checking `isRunning()`/`isStale()` gets the consumer kicked out after `sessionTimeout` (default 30 s). With librdkafka, processing longer than `max.poll.interval.ms` (Confluent's `rebalanceTimeout`, default 300000) makes the consumer leave the group, so its commits fail and another member reprocesses. Another variant: no `await consumer.disconnect()` on SIGTERM, so partitions sit idle until the session times out (broker default `session.timeout.ms` 45 s since Kafka 3.0).
- **Correct:** In `eachBatch`, loop with `if (!isRunning() || isStale()) break; ... resolveOffset(m.offset); await heartbeat();`. Keep per-message work under the poll interval, or pause the partition and process asynchronously. Handle `SIGTERM`/`SIGINT` with `await consumer.disconnect()` so the member leaves cleanly.
- **Source:** https://kafka.js.org/docs/consuming (eachBatch: resolveOffset, heartbeat, isRunning, isStale) ; https://github.com/confluentinc/confluent-kafka-javascript/blob/master/MIGRATION.md (rebalanceTimeout = max poll interval, heartbeats automatic)
- **Testable how:** Real Kafka. Two consumers in one group. The hidden test sends SIGTERM to consumer A's child process and asserts consumer B gets A's partitions in under 10 s (it fails with ~45 s if there is no disconnect). A second test makes a batch run longer than a small `sessionTimeout` and asserts no duplicates when the solution heartbeats.
- **Likelihood an LLM gets it wrong:** med. Graceful shutdown is often omitted in "small" consumers. isStale/heartbeat is niche.

### 14. KIP-848 consumer protocol: carrying classic config across
- **Mistake:** Turning on the new rebalance protocol (`group.protocol: 'consumer'`, GA since Kafka 4.0, supported by librdkafka ≥ 2.10 / Confluent JS ≥ 1.3, with describe support from 1.4) while keeping `session.timeout.ms`, `heartbeat.interval.ms` or `partition.assignment.strategy` / `partitionAssigners` on the client. Those are now broker-side or replaced. Another variant: expecting kafkajs to support it (it never will; it only speaks the classic protocol).
- **Correct:** With `group.protocol: 'consumer'`, remove those three settings. Use `group.remote.assignor` (`uniform` or `range`) if needed. Session and heartbeat go on the broker as `group.consumer.session.timeout.ms` and `group.consumer.heartbeat.interval.ms`. This requires a Kafka 4.x broker (`apache/kafka:4.3.1` works).
- **Source:** https://www.confluent.io/blog/kip-848-consumer-rebalance-protocol/ ; https://karafka.io/docs/Kafka-New-Rebalance-Protocol ; https://github.com/confluentinc/confluent-kafka-javascript/blob/master/CHANGELOG.md
- **Testable how:** Real Kafka 4.3.1. The task: "use the new consumer group protocol". The hidden test asserts `admin.describeGroups` reports the consumer group type and that the consumer receives messages. Mistaken configs fail at connect or join. Verify the exact error locally before freezing the test.
- **Likelihood an LLM gets it wrong:** high. The feature is recent (2025), and models default to classic tuning knobs.

### 15. Schema evolution and Confluent wire format
- **Mistake:** Adding a required field without a default to an Avro value schema under BACKWARD compatibility, which the registry rejects (or worse, compatibility was set to NONE). Upgrading producers first under BACKWARD. Hand-decoding Confluent-framed messages with `readInt32LE`, forgetting the magic byte, or treating Protobuf payloads as starting at byte 5 (Protobuf has a zigzag-varint message-index array after the ID, optimised to a single `0` for the first message type). Ignoring schema IDs in headers (Confluent 8.1.1+ / JS serdes ≥ 1.3.2: magic byte `1`, 16-byte GUID).
- **Correct:**
  - New fields get a `default`. Under BACKWARD, upgrade consumers first; under FORWARD, producers first.
  - Framing is byte 0 = `0`, bytes 1-4 = big-endian schema ID (`readInt32BE(1)`), then the payload. For Protobuf, payload after the message indexes.
  - Use `@confluentinc/schemaregistry` serdes rather than hand-rolling. Dispatch on the magic byte.
- **Source:** https://docs.confluent.io/platform/current/schema-registry/fundamentals/serdes-develop/index.html (wire format, GUID-in-header) ; https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html (compatibility types, upgrade order)
- **Testable how:** In-memory with `avsc` 5.7.9. Hidden tests:
  - `decode(buf)` on hand-built frames (BE ID 258 = bytes `00 00 01 02`, a Protobuf frame with indexes `[0]` and `[1,0]`), plus a magic-byte-1 frame that must raise a clear "unsupported format" or be handled.
  - The solution's v2 schema must resolve old v1 data: `avro.Type.forSchema(v2).createResolver(v1)` must not throw.
- **Likelihood an LLM gets it wrong:** med. BE plus magic byte is commonly known, but Protobuf indexes and the 2025 header/GUID format are not.

### 16. Picking kafkajs for new code, and its compression gap
- **Mistake:** Starting a new 2026 service on kafkajs (last release 2.2.4, Feb 2023; no KIP-848; only GZIP built in). Then consuming a topic that another team's producer writes with `lz4`/`zstd`/`snappy` fails at decode (`KafkaJSNotImplemented`-style codec error) unless a codec plugin is registered.
- **Correct:** For new code use `@confluentinc/kafka-javascript` (1.11.0, librdkafka 2.15.x, Node 24 binaries, all codecs built in). The pure-JS alternative is `@platformatic/kafka` (2.14.0). If kafkajs stays, register `kafkajs-lz4` / `@kafkajs/zstd` / `kafkajs-snappy` in `CompressionCodecs`.
- **Source:** https://www.npmjs.com/package/kafkajs (version/date) ; https://kafka.js.org/docs/producing (compression: only GZIP built in) ; https://github.com/confluentinc/confluent-kafka-javascript
- **Testable how:** Real Kafka. The fixture pre-produces records with lz4 compression using the Confluent client. The task says "consume orders and sum totals". The hidden test asserts the sum. A kafkajs solution without the codec fails.
- **Likelihood an LLM gets it wrong:** med-high. kafkajs is still the most common LLM answer for "Kafka in Node".

## Versions checked

| Thing | Version (2026-10-12) | Source |
|---|---|---|
| Apache Kafka | 4.3.1 latest stable (2026-06-25); supported lines 4.2.x (4.2.2 image 2026-09-28), 4.1.2; 4.4.0 and 4.3.2 at RC | https://kafka.apache.org/community/downloads/ ; Docker Hub `apache/kafka` tags |
| Docker image | `apache/kafka:4.3.1` (KRaft; ZooKeeper gone since 4.0; clients older than 2.1 protocol dropped by KIP-896) | https://hub.docker.com/r/apache/kafka ; https://kafka.apache.org/43/getting-started/compatibility/ |
| kafkajs | 2.2.4, last publish 2023-02-27 (effectively unmaintained). Kafka 4.x compatibility not officially stated; verify with the image before using it in evals | `npm view kafkajs` ; https://github.com/tulios/kafkajs |
| @confluentinc/kafka-javascript | 1.11.0 (2026-10-07); bundles librdkafka 2.15.x (since 1.10.0); Node ≥18, Node 24 prebuilt binaries since 1.4.0; 1.11.0 changed `connect()` to retry `retries+1` times | `npm view` ; https://github.com/confluentinc/confluent-kafka-javascript/blob/master/CHANGELOG.md |
| @confluentinc/schemaregistry | 1.11.0 (2026-10-07); schema ID in headers since 1.3.2 | `npm view` ; CHANGELOG above |
| @platformatic/kafka | 2.14.0 (2026-10-07), pure-JS alternative | `npm view` |
| node-rdkafka | 3.6.1 (2025-12-03), superseded by the Confluent client | `npm view` |
| avsc | 5.7.9 | `npm view` |
| @kafkajs/confluent-schema-registry | 4.1.0 | `npm view` |
| Node (local) | v24.21.0 | `node --version` |

## Verified against the broker (2026-10-13, `apache/kafka:4.3.1`, Node 24.21)

**Does kafkajs 2.2.4 work against Kafka 4.3?** Yes, for everything the cases use: admin
(createTopics, fetchOffsets, resetOffsets, deleteTopics), idempotent producer, transactional
producer (`transaction()` + `commit()`), and classic consumer groups (join ~3 s, commits,
`fromBeginning`). Consumed `message.offset` is a string and header values arrive as `Buffer`.
Only noise: Node 24 prints `TimeoutNegativeWarning` from kafkajs's timer code; harmless.
kafkajs still only speaks the classic group protocol (`describeGroups` type `CLASSIC`).

**What does the KIP-848 config mistake (#14) produce?** It fails fast and synchronously in
`kafka.consumer(...)` (Confluent 1.11.0), before any network I/O, with a `KafkaJSError`:
- `'session.timeout.ms'` → code -1, "`session.timeout.ms` is not supported for `group.protocol=consumer` or share consumer. it is defined broker side"
- `'heartbeat.interval.ms'` → same shape, "... it is defined broker side"
- `'partition.assignment.strategy'` → "... is not supported for `group.protocol=consumer`. use `group.remote.assignor` instead"
- `kafkaJS.sessionTimeout` → code -186 (`ERR__INVALID_ARG`), "sessionTimeout is not supported when group.protocol is not 'classic'."
- `kafkaJS.partitionAssigners` → code -186, "partitionAssignors is not supported when group.protocol is not 'classic'."
- `'max.poll.interval.ms'` is still accepted with the new protocol.
A clean `'group.protocol': 'consumer'` consumer joins in ~1.5 s (classic: ~4 s) and
`admin.describeGroups` reports `type: ConsumerGroupTypes.CONSUMER` (1) vs `CLASSIC` (2),
assignor `uniform`. So the trap is loud: a model that runs its code against the broker will see it.

**Trap #3 errors are also loud** in 1.11.0: KafkaJS-style keys at the top level of
`new Kafka({...})` / `kafka.consumer({...})` throw ("seems to be a KafkaJS property in the main
config block"); `subscribe({ fromBeginning })`, `run({ autoCommit })`, `send({ acks })` and
`send({ compression })` throw with a before/after migration hint. With no `fromBeginning`, a new
group with the default reset sees nothing already on the topic (waited 8 s).

**Confluent `consumer.disconnect()` waits for the in-flight `eachMessage` to finish** before
leaving the group, so `process.once('SIGTERM', () => consumer.disconnect())` is a correct
graceful shutdown; dying without it keeps the partition unowned until the 45 s session timeout.
