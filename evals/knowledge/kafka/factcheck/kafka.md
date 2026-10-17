# Kafka exam fact-check

Date: 2026-10-15. Files: evals/knowledge/kafka/exams/v1.json .. v5.json (100 questions).
Current version checked: Apache Kafka 4.3.1 (2026-06-25) is the newest line; KRaft-only. [https://kafka.apache.org/community/downloads/]

No ZooKeeper-era answers found. bin/check-exam: 0 problems before and after edits.

## v1

| id | verdict | source | note |
|---|---|---|---|
| kafka-v1-q01 | ok | known | textbook |
| kafka-v1-q02 | ok | known | textbook |
| kafka-v1-q03 | ok | known | textbook |
| kafka-v1-q04 | ok | https://kafka.js.org/docs/producing | kafkajs acks default -1, idempotent false, maxInFlight unlimited |
| kafka-v1-q05 | ok | https://kafka.apache.org/43/operations/consumer-rebalance-protocol/ | KIP-848 GA since 4.0, incremental |
| kafka-v1-q06 | ok | known | textbook |
| kafka-v1-q07 | ok | https://github.com/confluentinc/librdkafka/blob/master/CONFIGURATION.md | max.poll.interval.ms 300000 governs |
| kafka-v1-q08 | fixed | https://kafka.apache.org/43/operations/consumer-rebalance-protocol/ | explain said Confluent client fails "at construction"; source throws in connect() config finalisation. Reworded. |
| kafka-v1-q09 | ok | known | textbook |
| kafka-v1-q10 | ok | known | textbook |
| kafka-v1-q11 | ok | known | textbook |
| kafka-v1-q12 | ok | https://kafka.apache.org/43/configuration/consumer-configs/ | Java isolation.level default read_uncommitted |
| kafka-v1-q13 | ok | known | textbook |
| kafka-v1-q14 | ok | known | textbook |
| kafka-v1-q15 | ok | https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html | BACKWARD: consumers first, field needs default |
| kafka-v1-q16 | ok | known | textbook |
| kafka-v1-q17 | ok | https://kafka.apache.org/43/operations/geo-replication-cross-cluster-data-mirroring/ | MM2 checkpoints/offset sync |
| kafka-v1-q18 | ok | https://kafka.apache.org/43/configuration/producer-configs/ | acks=all semantics |
| kafka-v1-q19 | ok | known | textbook |
| kafka-v1-q20 | ok | known | textbook |

## v2

| id | verdict | source | note |
|---|---|---|---|
| kafka-v2-q01 | ok | known | textbook |
| kafka-v2-q02 | ok | https://github.com/confluentinc/librdkafka/blob/master/CONFIGURATION.md | partitioner default consistent_random (CRC32) |
| kafka-v2-q03 | ok | known | textbook |
| kafka-v2-q04 | ok | known | textbook |
| kafka-v2-q05 | fixed | https://github.com/confluentinc/confluent-kafka-javascript/blob/master/lib/kafkajs/_consumer.js | stem said "default 45-second" session timeout; Confluent KafkaJS API defaults to 30 s (librdkafka 45 s). Dropped "default". |
| kafka-v2-q06 | ok | known | textbook |
| kafka-v2-q07 | ok | known | textbook |
| kafka-v2-q08 | ok | https://registry.npmjs.org/kafkajs | kafkajs 2.2.4, 2023-02-27, latest |
| kafka-v2-q09 | ok | https://github.com/confluentinc/librdkafka/blob/master/CONFIGURATION.md | enable.idempotence default false |
| kafka-v2-q10 | ok | known | textbook |
| kafka-v2-q11 | fixed | https://github.com/apache/kafka/blob/4.3/clients/src/main/java/org/apache/kafka/clients/producer/KafkaProducer.java | key was "stable transactionalId per instance"; partitions moved to a different pod, so that fences nothing. Since KIP-447 fencing comes from consumer group metadata in sendOffsets. Rewrote correct option, why, explain. |
| kafka-v2-q12 | ok | known | textbook |
| kafka-v2-q13 | ok | known | textbook |
| kafka-v2-q14 | ok | known | textbook |
| kafka-v2-q15 | ok | https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html | FORWARD: producers first |
| kafka-v2-q16 | ok | known | textbook |
| kafka-v2-q17 | ok | https://kafka.apache.org/43/operations/geo-replication-cross-cluster-data-mirroring/ | DefaultReplicationPolicy {source}.{topic} |
| kafka-v2-q18 | ok | https://kafka.apache.org/43/operations/geo-replication-cross-cluster-data-mirroring/ | prefix keeps provenance |
| kafka-v2-q19 | ok | https://kafka.apache.org/43/operations/kraft/ | 3 controllers tolerate 1 |
| kafka-v2-q20 | ok | known | textbook |

## v3

| id | verdict | source | note |
|---|---|---|---|
| kafka-v3-q01 | ok | https://github.com/confluentinc/confluent-kafka-javascript/blob/master/lib/kafkajs/_producer.js | createPartitioner throws ERR__NOT_IMPLEMENTED |
| kafka-v3-q02 | ok | known | textbook |
| kafka-v3-q03 | ok | known | textbook |
| kafka-v3-q04 | ok | known | textbook |
| kafka-v3-q05 | ok | known | textbook |
| kafka-v3-q06 | ok | https://kafka.apache.org/43/operations/consumer-rebalance-protocol/ | incremental, no global barrier |
| kafka-v3-q07 | ok | known | textbook |
| kafka-v3-q08 | ok | https://kafka.apache.org/43/configuration/broker-configs/ | offsets.retention.minutes 10080 (7 d), counts from group empty |
| kafka-v3-q09 | ok | known | textbook |
| kafka-v3-q10 | ok | known | textbook |
| kafka-v3-q11 | ok | known | textbook |
| kafka-v3-q12 | ok | known | textbook |
| kafka-v3-q13 | ok | known | textbook |
| kafka-v3-q14 | ok | https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html | non-transitive checks latest only |
| kafka-v3-q15 | ok | known | textbook |
| kafka-v3-q16 | ok | known | textbook |
| kafka-v3-q17 | ok | known | textbook |
| kafka-v3-q18 | ok | https://docs.confluent.io/platform/current/multi-dc-deployments/cluster-linking/index.html | mirror topics keep offsets |
| kafka-v3-q19 | ok | known | textbook |
| kafka-v3-q20 | ok | https://kafka.apache.org/43/configuration/producer-configs/ | linger.ms default 5 since 4.0; raising still right |

## v4

| id | verdict | source | note |
|---|---|---|---|
| kafka-v4-q01 | ok | known | textbook |
| kafka-v4-q02 | ok | known | textbook |
| kafka-v4-q03 | ok | known | textbook |
| kafka-v4-q04 | ok | https://kafka.apache.org/43/configuration/topic-configs/ | delete.retention.ms 1 day |
| kafka-v4-q05 | ok | https://kafka.apache.org/43/configuration/consumer-configs/ | max.poll.interval.ms still client-side |
| kafka-v4-q06 | ok | known | textbook |
| kafka-v4-q07 | ok | known | textbook |
| kafka-v4-q08 | ok | known | textbook |
| kafka-v4-q09 | ok | known | textbook |
| kafka-v4-q10 | ok | known | textbook |
| kafka-v4-q11 | fixed | https://kafka.apache.org/43/configuration/broker-configs/ | 40-min transaction impossible with defaults (transaction.max.timeout.ms 15 min, transaction.timeout.ms 60 s). Stem now says timeouts were raised; explain names the cap. |
| kafka-v4-q12 | ok | known | textbook |
| kafka-v4-q13 | ok | known | textbook |
| kafka-v4-q14 | ok | known | textbook |
| kafka-v4-q15 | ok | known | textbook |
| kafka-v4-q16 | ok | https://kafka.apache.org/43/configuration/broker-configs/ | message.max.bytes 1048588 |
| kafka-v4-q17 | ok | https://kafka.apache.org/43/operations/geo-replication-cross-cluster-data-mirroring/ | replication-latency-ms metric |
| kafka-v4-q18 | ok | known | textbook |
| kafka-v4-q19 | ok | known | textbook |
| kafka-v4-q20 | ok | known | textbook |

## v5

| id | verdict | source | note |
|---|---|---|---|
| kafka-v5-q01 | ok | known | textbook |
| kafka-v5-q02 | ok | known | textbook |
| kafka-v5-q03 | ok | known | textbook |
| kafka-v5-q04 | ok | known | textbook |
| kafka-v5-q05 | ok | https://github.com/confluentinc/confluent-kafka-javascript/blob/master/lib/kafkajs/_consumer.js | throw -> seek back, "may be reprocessed" |
| kafka-v5-q06 | ok | https://github.com/apache/kafka/blob/4.3/group-coordinator/src/main/java/org/apache/kafka/coordinator/group/assignor/RangeAssignor.java | range co-partitions homogeneous groups; uniform default per REB |
| kafka-v5-q07 | ok | known | textbook |
| kafka-v5-q08 | ok | known | textbook |
| kafka-v5-q09 | ok | known | textbook |
| kafka-v5-q10 | ok | https://kafka.apache.org/43/configuration/producer-configs/ | acks=all = in-sync set |
| kafka-v5-q11 | ok | known | textbook |
| kafka-v5-q12 | ok | known | textbook |
| kafka-v5-q13 | ok | known | textbook |
| kafka-v5-q14 | ok | https://avro.apache.org/docs/1.12.0/specification/ | enum default used for unknown writer symbol |
| kafka-v5-q15 | ok | known | textbook |
| kafka-v5-q16 | ok | known | textbook |
| kafka-v5-q17 | ok | known | textbook |
| kafka-v5-q18 | ok | known | textbook |
| kafka-v5-q19 | ok | known | textbook |
| kafka-v5-q20 | ok | https://kafka.apache.org/43/operations/kraft/ | combined mode not recommended for critical |
