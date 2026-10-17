# Fact-check: redis-caching v1-v5, distributed-systems v1-v5

Date: 2026-10-15. Checker: Claude subagent. Files: evals/knowledge/redis-caching/exams/v1-v5.json, evals/knowledge/distributed-systems/exams/v1-v5.json.
Local evidence: redis-server 8.10.2 (Homebrew) run in scratch on port 6417 for CONFIG defaults and new commands.

## redis-caching v1

| id | verdict | source | note |
|---|---|---|---|
| redis-caching-v1-q01 | ok | https://redis.io/docs/latest/develop/whats-new/8-4/ | SET IFEQ is 8.4 |
| redis-caching-v1-q02 | ok | https://redis.io/docs/latest/operate/oss_and_stack/management/replication/ | async replication loses acked writes |
| redis-caching-v1-q03 | ok | known |  |
| redis-caching-v1-q04 | ok | known |  |
| redis-caching-v1-q05 | ok | known |  |
| redis-caching-v1-q06 | ok | https://redis.io/docs/latest/develop/whats-new/8-6/ | HOTKEYS 8.6 |
| redis-caching-v1-q07 | ok | https://redis.io/docs/latest/develop/reference/eviction/ | volatile-* ignore no-TTL keys |
| redis-caching-v1-q08 | ok | known | XFetch sign (Vattani et al. 2015) |
| redis-caching-v1-q09 | ok | known |  |
| redis-caching-v1-q10 | ok | https://redis.io/docs/latest/develop/reference/eviction/ | default noeviction; also local redis-server 8.10.2 |
| redis-caching-v1-q11 | ok | https://redis.io/docs/latest/develop/reference/eviction/ |  |
| redis-caching-v1-q12 | ok | local redis-server 8.10.2 | lazyfree-* all no in 8.10.2 |
| redis-caching-v1-q13 | ok | known | CROSSSLOT for MULTI/Lua |
| redis-caching-v1-q14 | ok | https://redis.io/docs/latest/operate/oss_and_stack/management/replication/ |  |
| redis-caching-v1-q15 | ok | https://redis.io/docs/latest/operate/oss_and_stack/management/replication/ | persistence-off safety note |
| redis-caching-v1-q16 | ok | known |  |
| redis-caching-v1-q17 | ok | https://redis.io/docs/latest/develop/whats-new/8-4/ | DELEX 8.4; local redis-server 8.10.2 DELEX IFEQ ran |
| redis-caching-v1-q18 | ok | https://redis.io/docs/latest/commands/increx/ | INCREX since 8.8.0, ENX semantics |
| redis-caching-v1-q19 | ok | known | pub/sub at-most-once |
| redis-caching-v1-q20 | ok | known | Kleppmann fencing |

## redis-caching v2

| id | verdict | source | note |
|---|---|---|---|
| redis-caching-v2-q01 | ok | known |  |
| redis-caching-v2-q02 | ok | known |  |
| redis-caching-v2-q03 | ok | known | SET drops TTL (SET docs) |
| redis-caching-v2-q04 | ok | known | RFC 9111 private/no-cache |
| redis-caching-v2-q05 | ok | known |  |
| redis-caching-v2-q06 | ok | known |  |
| redis-caching-v2-q07 | ok | known |  |
| redis-caching-v2-q08 | ok | known |  |
| redis-caching-v2-q09 | ok | known |  |
| redis-caching-v2-q10 | ok | known |  |
| redis-caching-v2-q11 | ok | https://redis.io/docs/latest/develop/reference/eviction/ | LFU w/ decay |
| redis-caching-v2-q12 | ok | known | 1.2MB*5000*8=48Gbps |
| redis-caching-v2-q13 | ok | https://redis.io/docs/latest/operate/oss_and_stack/management/replication/ |  |
| redis-caching-v2-q14 | ok | known |  |
| redis-caching-v2-q15 | ok | known |  |
| redis-caching-v2-q16 | ok | https://redis.io/docs/latest/operate/oss_and_stack/management/replication/ | min-replicas-* semantics |
| redis-caching-v2-q17 | ok | known |  |
| redis-caching-v2-q18 | ok | known |  |
| redis-caching-v2-q19 | ok | https://redis.io/docs/latest/develop/whats-new/8-4/ | XREADGROUP CLAIM 8.4 |
| redis-caching-v2-q20 | ok | known | no rollback; ioredis tuples per BRIEF local check |

## redis-caching v3

| id | verdict | source | note |
|---|---|---|---|
| redis-caching-v3-q01 | ok | known |  |
| redis-caching-v3-q02 | ok | known |  |
| redis-caching-v3-q03 | ok | known |  |
| redis-caching-v3-q04 | ok | known |  |
| redis-caching-v3-q05 | ok | known |  |
| redis-caching-v3-q06 | ok | https://redis.io/docs/latest/operate/oss_and_stack/management/replication/ |  |
| redis-caching-v3-q07 | ok | known |  |
| redis-caching-v3-q08 | ok | known | CLIENT TRACKING |
| redis-caching-v3-q09 | ok | known |  |
| redis-caching-v3-q10 | ok | https://redis.io/docs/latest/develop/reference/eviction/ | buffers/fork headroom |
| redis-caching-v3-q11 | ok | known |  |
| redis-caching-v3-q12 | ok | known |  |
| redis-caching-v3-q13 | ok | https://redis.io/docs/latest/commands/wait/ | WAIT not strongly consistent; blocks only caller |
| redis-caching-v3-q14 | ok | https://redis.io/docs/latest/operate/oss_and_stack/management/replication/ | new repl ID on empty restart |
| redis-caching-v3-q15 | ok | known | sharded pub/sub 7.0 |
| redis-caching-v3-q16 | ok | known |  |
| redis-caching-v3-q17 | ok | known |  |
| redis-caching-v3-q18 | ok | known |  |
| redis-caching-v3-q19 | ok | known | XAUTOCLAIM cursor |
| redis-caching-v3-q20 | ok | known |  |

## redis-caching v4

| id | verdict | source | note |
|---|---|---|---|
| redis-caching-v4-q01 | ok | known |  |
| redis-caching-v4-q02 | ok | known |  |
| redis-caching-v4-q03 | ok | known |  |
| redis-caching-v4-q04 | ok | known |  |
| redis-caching-v4-q05 | ok | known |  |
| redis-caching-v4-q06 | ok | known | FB memcache leases |
| redis-caching-v4-q07 | ok | known | GETEX sliding |
| redis-caching-v4-q08 | ok | known |  |
| redis-caching-v4-q09 | ok | known | RFC 5861 stale-while-revalidate |
| redis-caching-v4-q10 | ok | https://redis.io/docs/latest/develop/reference/eviction/ |  |
| redis-caching-v4-q11 | ok | known |  |
| redis-caching-v4-q12 | ok | known | activedefrag/MEMORY PURGE (jemalloc) |
| redis-caching-v4-q13 | ok | known | cluster script key rules |
| redis-caching-v4-q14 | ok | known | cluster-require-full-coverage yes |
| redis-caching-v4-q15 | ok | known |  |
| redis-caching-v4-q16 | ok | known |  |
| redis-caching-v4-q17 | ok | known |  |
| redis-caching-v4-q18 | ok | known |  |
| redis-caching-v4-q19 | fixed | local redis-server 8.10.2 | FIXED: explain now names XADD/XTRIM ACKED (8.2.0, COMMAND DOCS) |
| redis-caching-v4-q20 | ok | known |  |

## redis-caching v5

| id | verdict | source | note |
|---|---|---|---|
| redis-caching-v5-q01 | ok | known | RFC 9111 |
| redis-caching-v5-q02 | ok | known |  |
| redis-caching-v5-q03 | ok | known |  |
| redis-caching-v5-q04 | ok | known |  |
| redis-caching-v5-q05 | ok | known |  |
| redis-caching-v5-q06 | ok | known |  |
| redis-caching-v5-q07 | ok | known |  |
| redis-caching-v5-q08 | ok | known |  |
| redis-caching-v5-q09 | fixed | https://redis.io/docs/latest/commands/hotkeys/ | FIXED: HOTKEYS default sample-ratio 1 (not sampled); top-K structure |
| redis-caching-v5-q10 | ok | local redis-server 8.10.2 | lazyfree-lazy-expire default no |
| redis-caching-v5-q11 | ok | known |  |
| redis-caching-v5-q12 | ok | known | HLL 12KB, 0.81% |
| redis-caching-v5-q13 | ok | known |  |
| redis-caching-v5-q14 | ok | known |  |
| redis-caching-v5-q15 | ok | https://redis.io/docs/latest/operate/oss_and_stack/management/replication/ |  |
| redis-caching-v5-q16 | ok | known |  |
| redis-caching-v5-q17 | ok | https://redis.io/docs/latest/commands/increx/ | UBOUND reject -> applied 0 |
| redis-caching-v5-q18 | ok | known |  |
| redis-caching-v5-q19 | ok | known |  |
| redis-caching-v5-q20 | ok | https://redis.io/docs/latest/commands/wait/ |  |

## distributed-systems v1

| id | verdict | source | note |
|---|---|---|---|
| distributed-systems-v1-q01 | ok | known |  |
| distributed-systems-v1-q02 | ok | known | W+R>N |
| distributed-systems-v1-q03 | ok | https://www.postgresql.org/docs/17/runtime-config-replication.html | ANY 1 quorum commit |
| distributed-systems-v1-q04 | ok | known | CAP per operation |
| distributed-systems-v1-q05 | ok | known |  |
| distributed-systems-v1-q06 | ok | known |  |
| distributed-systems-v1-q07 | ok | known | Kleppmann 2016 fencing |
| distributed-systems-v1-q08 | ok | known | etcd 2f+1 |
| distributed-systems-v1-q09 | ok | known | Kafka txns cover Kafka only |
| distributed-systems-v1-q10 | ok | known | idempotency key per op |
| distributed-systems-v1-q11 | ok | known | sagas, Garcia-Molina 1987 |
| distributed-systems-v1-q12 | ok | known |  |
| distributed-systems-v1-q13 | ok | known | 4^3=64 |
| distributed-systems-v1-q14 | ok | known | AWS backoff+jitter |
| distributed-systems-v1-q15 | ok | known |  |
| distributed-systems-v1-q16 | ok | known | opossum errorFilter |
| distributed-systems-v1-q17 | ok | known |  |
| distributed-systems-v1-q18 | ok | known | CRDT can't enforce >=0 |
| distributed-systems-v1-q19 | ok | known | AWS static stability |
| distributed-systems-v1-q20 | ok | known | cells |

## distributed-systems v2

| id | verdict | source | note |
|---|---|---|---|
| distributed-systems-v2-q01 | ok | known | monotonic reads |
| distributed-systems-v2-q02 | ok | known |  |
| distributed-systems-v2-q03 | ok | known | PACELC |
| distributed-systems-v2-q04 | ok | known | PG RC re-evaluates WHERE |
| distributed-systems-v2-q05 | ok | known |  |
| distributed-systems-v2-q06 | ok | known | murmur2 % partitions; classic groups |
| distributed-systems-v2-q07 | ok | known | advisory locks per session |
| distributed-systems-v2-q08 | ok | known |  |
| distributed-systems-v2-q09 | ok | known | xid8/pg_snapshot_xmin PG13+ |
| distributed-systems-v2-q10 | ok | known |  |
| distributed-systems-v2-q11 | ok | known |  |
| distributed-systems-v2-q12 | ok | known |  |
| distributed-systems-v2-q13 | fixed | https://www.rfc-editor.org/rfc/rfc9110#field.retry-after | FIXED: HTTP-date said Wed, 15 Oct 2026 is a Thursday |
| distributed-systems-v2-q14 | ok | known | Little's law 800*0.025=20 |
| distributed-systems-v2-q15 | ok | known |  |
| distributed-systems-v2-q16 | ok | known |  |
| distributed-systems-v2-q17 | ok | known | bulkhead |
| distributed-systems-v2-q18 | ok | known | C(8,2)=28 |
| distributed-systems-v2-q19 | ok | known |  |
| distributed-systems-v2-q20 | ok | known | 300/(3-1)=150 |

## distributed-systems v3

| id | verdict | source | note |
|---|---|---|---|
| distributed-systems-v3-q01 | ok | known |  |
| distributed-systems-v3-q02 | ok | known | Dynamo sloppy quorum |
| distributed-systems-v3-q03 | ok | known |  |
| distributed-systems-v3-q04 | ok | known |  |
| distributed-systems-v3-q05 | ok | known |  |
| distributed-systems-v3-q06 | ok | known | vnodes |
| distributed-systems-v3-q07 | ok | known | monotonic clock |
| distributed-systems-v3-q08 | ok | known | witness |
| distributed-systems-v3-q09 | ok | known | commit offset+1 |
| distributed-systems-v3-q10 | ok | https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html | default 30 s, ChangeMessageVisibility |
| distributed-systems-v3-q11 | ok | known | pivot txn |
| distributed-systems-v3-q12 | ok | known | idempotent producer per session |
| distributed-systems-v3-q13 | ok | known | metastable failure |
| distributed-systems-v3-q14 | ok | known |  |
| distributed-systems-v3-q15 | ok | known | hedged requests (Dean & Barroso) |
| distributed-systems-v3-q16 | fixed | https://nodejs.org/docs/latest-v24.x/api/http.html | FIXED: explain; Node 24 default 5000 (verified locally 24.21) but Node 26 raised to 65 s: https://github.com/nodejs/node/pull/62782 |
| distributed-systems-v3-q17 | ok | known |  |
| distributed-systems-v3-q18 | ok | known |  |
| distributed-systems-v3-q19 | ok | known |  |
| distributed-systems-v3-q20 | ok | known |  |

## distributed-systems v4

| id | verdict | source | note |
|---|---|---|---|
| distributed-systems-v4-q01 | ok | known | N=5, 2+2+1, W=R=3 |
| distributed-systems-v4-q02 | ok | known | causal order via sequencer |
| distributed-systems-v4-q03 | ok | known |  |
| distributed-systems-v4-q04 | ok | known | LSN token |
| distributed-systems-v4-q05 | ok | known |  |
| distributed-systems-v4-q06 | ok | known | 41+10+12 bits |
| distributed-systems-v4-q07 | ok | known |  |
| distributed-systems-v4-q08 | ok | known | etcd linearizable default |
| distributed-systems-v4-q09 | ok | known | IETF idempotency draft 422/409 |
| distributed-systems-v4-q10 | ok | known |  |
| distributed-systems-v4-q11 | ok | known | semantic lock |
| distributed-systems-v4-q12 | ok | known |  |
| distributed-systems-v4-q13 | ok | known |  |
| distributed-systems-v4-q14 | ok | known | stream pipeline backpressure |
| distributed-systems-v4-q15 | ok | known | opossum abortController |
| distributed-systems-v4-q16 | ok | known | deadline propagation |
| distributed-systems-v4-q17 | ok | known |  |
| distributed-systems-v4-q18 | ok | known | G-counter |
| distributed-systems-v4-q19 | ok | known | static stability |
| distributed-systems-v4-q20 | ok | known |  |

## distributed-systems v5

| id | verdict | source | note |
|---|---|---|---|
| distributed-systems-v5-q01 | ok | https://redis.io/docs/latest/commands/wait/ | WAIT not strongly consistent |
| distributed-systems-v5-q02 | ok | known | SSI write skew |
| distributed-systems-v5-q03 | ok | known |  |
| distributed-systems-v5-q04 | ok | https://www.postgresql.org/docs/17/runtime-config-replication.html | remote_apply vs on/remote_write |
| distributed-systems-v5-q05 | ok | known |  |
| distributed-systems-v5-q06 | ok | known |  |
| distributed-systems-v5-q07 | ok | known |  |
| distributed-systems-v5-q08 | ok | known | version vectors |
| distributed-systems-v5-q09 | ok | known |  |
| distributed-systems-v5-q10 | ok | known | read_committed |
| distributed-systems-v5-q11 | ok | known |  |
| distributed-systems-v5-q12 | ok | known | XAUTOCLAIM |
| distributed-systems-v5-q13 | ok | known |  |
| distributed-systems-v5-q14 | ok | https://github.com/sindresorhus/p-retry (readme, v8.0.1 via npm view) | defaults retries 10, randomize false, maxTimeout Infinity; 1023 s ~ 17 min |
| distributed-systems-v5-q15 | ok | known |  |
| distributed-systems-v5-q16 | ok | known |  |
| distributed-systems-v5-q17 | ok | known |  |
| distributed-systems-v5-q18 | ok | known |  |
| distributed-systems-v5-q19 | ok | known | pg_rewind |
| distributed-systems-v5-q20 | ok | known |  |

## Summary

- 200 checked, 196 ok, 4 fixed, 0 unsure. bin/check-exam exit 0 (10 variants, 200 questions, 0 problems).
- Fixes: redis-caching-v4-q19 (explain: XADD/XTRIM ACKED since 8.2), redis-caching-v5-q09 (HOTKEYS is top-K, unsampled by default), distributed-systems-v2-q13 (weekday in HTTP-date), distributed-systems-v3-q16 (explain: Node 26 keepAliveTimeout default 65 s).
