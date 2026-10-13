# Distributed systems in practice (backend services): research brief

Slug: `distributed-systems`. Researched 2026-10-12. Target: tiny Node 24 / TypeScript
projects, `node --test`, hidden tests. Facts marked **(verified locally)** were run on
this machine (Node 24.21.0, Redis 8.10.2) and not only read from docs.

## Mental model

1. The network can lose, delay, duplicate or reorder anything. A timeout means "I don't know", not "it failed".
2. Because "I don't know" is normal, every write that can be retried must be idempotent. The idempotency key belongs to the logical operation, not to one attempt.
3. Retries are load. Without backoff, jitter, a cap and a total budget, they turn a small blip into an outage (retry storms, multiplied across layers).
4. Time budgets flow down. A request has one deadline, and every hop and retry spends from it. Per-attempt timeouts that reset are the classic bug.
5. Wall clocks jump (NTP, VMs, leap seconds). Measure durations with a monotonic clock. Never compare timestamps from different machines to decide who is "first".
6. A lock with a TTL is a lease. A paused process can wake up still believing it holds it. Correctness needs the *resource* to reject stale holders (fencing tokens).
7. "Exactly once" in practice means at-least-once delivery plus an idempotent consumer, with the dedupe record written in the same transaction as the effect.
8. Never write to two systems (DB plus broker) and hope both succeed. Write once (DB plus outbox row in one transaction) and relay the rest.
9. An outbox or log reader must not skip rows that commit late. Sequence order is not commit order.
10. Sagas replace distributed transactions with steps plus compensations. A step that timed out may have succeeded, so it gets compensated too.
11. Consistency is a spectrum: linearizable, then read-your-writes and monotonic reads, then eventual. PACELC: even with no partition you trade latency against consistency (replica reads, async replication).
12. Protect yourself under load: bounded queues, bounded concurrency, shed load early (429/503 with Retry-After), and circuit breakers that fail fast and probe carefully.

## Traps

### 1. Exponential backoff with no jitter (or trusting a library's default)
- **Mistake:** `delay = base * 2 ** attempt`, maybe with `+ Math.random() * 100`. Or `pRetry(fn, {retries: 5})`, assuming p-retry adds jitter. It doesn't: p-retry 8.0.1 defaults are `randomize: false`, `factor: 2`, `minTimeout: 1000`, `maxTimeout: Infinity` and `retries: 10`. Clients that fail together retry in lockstep, and with no cap the delay grows without bound.
- **Correct:** Use capped exponential backoff with full jitter, `sleep = random(0, min(cap, base * 2 ** attempt))` (AWS), or decorrelated jitter. Set a cap and a total budget (p-retry: `randomize: true`, a finite `maxTimeout` and `maxRetryTime`). Note that p-retry's `randomize` only multiplies by 1–2, which is weaker than full jitter.
- **Source:** https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/ ; https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/ ; https://github.com/sindresorhus/p-retry (readme, v8.0.1)
- **Testable how:** Write `retry(fn, {base, cap, maxAttempts, random, sleep})` with an injected RNG and sleep. Hidden test: 50 simulated clients fail at t=0. Assert that the recorded first-retry delays have more than 40 distinct values and all fall in `[0, cap]`, and that no single delay exceeds `cap` even at attempt 30. In-memory, no services.
- **Likelihood an LLM gets it wrong:** med. It knows "jitter" but often writes additive jitter, forgets the cap, or reaches for p-retry and trusts its defaults.

### 2. `Retry-After` parsed as seconds only, or ignored
- **Mistake:** `parseInt(res.headers.get('retry-after')) * 1000`. That yields NaN for the HTTP-date form, which then becomes an immediate retry. Others ignore the header and use their own backoff on 429/503, or honour an absurd value (a server says 3600 inside a 2 s budget).
- **Correct:** RFC 9110 §10.2.3 allows `Retry-After` as `delay-seconds` **or** an `HTTP-date`. Parse both (`Date.parse` for the date, then subtract now), clamp at 0, and use it in place of computed backoff for 429/503. If it exceeds the remaining deadline, fail fast instead of sleeping.
- **Source:** https://www.rfc-editor.org/rfc/rfc9110#field.retry-after
- **Testable how:** A fake fetch returns 503 with `Retry-After: <HTTP-date 7 s ahead>`, then 200. Use `t.mock.timers.enable({apis:['Date','setTimeout']})` and assert the client waits about 7000 ms, not 0 ms and not NaN. A second case uses `Retry-After: 120` with a 5 s deadline and expects a fast reject. In-memory with the fake clock.
- **Likelihood an LLM gets it wrong:** high. The date form is almost always forgotten.

### 3. New idempotency key per attempt, and retrying the wrong errors
- **Mistake:** `fetch(url, {method:'POST', headers:{'Idempotency-Key': randomUUID()}})` *inside* the retry loop, so every attempt is a new operation and you get double charges. A second mistake is retrying every non-2xx, including 400/401/403/409/422. A third is retrying a POST after a timeout when the server has no idempotency support.
- **Correct:** Generate the key once per logical operation, outside the loop, and reuse it on every attempt. Retry only on network errors (`TypeError` from fetch with `cause.code` such as `ECONNRESET`/`UND_ERR_SOCKET`), timeouts, 408, 429, 502, 503 and 504, plus 500 only if the operation is idempotent. Never retry other 4xx. (p-retry v8 aborts retries on non-network `TypeError`s by itself, and `shouldRetry` filters the rest.)
- **Source:** https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/ (draft-07, 2025-10-15) ; https://docs.stripe.com/api/idempotent_requests ; https://github.com/sindresorhus/p-retry
- **Testable how:** A fake payment server fails the first 2 POSTs with 503/ECONNRESET *after* recording the charge, then succeeds. Assert it saw exactly 1 distinct `Idempotency-Key` and recorded 1 charge. A separate case returns 422, and the test asserts exactly 1 call was made. In-memory fake fetch.
- **Likelihood an LLM gets it wrong:** med. The key-in-loop bug shows up when the key is generated in a helper that is itself retried.

### 4. Per-attempt timeouts with no overall deadline; fetch has no total timeout
- **Mistake:** `for (...) await fetch(url, {signal: AbortSignal.timeout(2000)})` with 3 attempts and backoff. The real worst case is about 3×2 s plus sleeps, which blows the caller's 2 s SLA. Other variants: no timeout at all (Node 24's undici fetch defaults to `headersTimeout`/`bodyTimeout` = 300 s, so a slow-drip body hangs for minutes); ignoring the caller's own `signal`; and retrying after the *caller* cancelled. `TimeoutError` vs `AbortError` are confused.
- **Correct:** Compute `deadline = now + budget` once. Each attempt uses `AbortSignal.any([callerSignal, AbortSignal.timeout(deadline - performance.now())])`. Don't sleep past the deadline. Don't retry when `callerSignal.aborted`. Pass the remaining budget downstream (for example a `x-request-deadline` header, or gRPC `grpc-timeout`). A real `AbortSignal.timeout` rejects with a `DOMException` named `TimeoutError`, while a user abort gives `AbortError`. Server side, the Node 24 defaults are `keepAliveTimeout` 5000, `headersTimeout` 60000, `requestTimeout` 300000 and `server.timeout` 0. Behind an LB with a 60 s idle timeout, a 5 s keep-alive causes sporadic 502s/ECONNRESET, so set `keepAliveTimeout` above the LB idle timeout and keep `headersTimeout` above that.
- **Source:** https://nodejs.org/docs/latest-v24.x/api/globals.html#static-method-abortsignalanyiterable ; https://nodejs.org/docs/latest-v24.x/api/http.html ; https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/
- **Testable how:** A fake fetch never resolves until its signal aborts, and the client is called with a 1000 ms budget and 5 attempts. With `t.mock.timers.enable({apis:['setTimeout','Date','AbortSignal.timeout']})`, tick 1001 ms and assert the call has rejected and the fake saw at most 1–2 attempts in total. A second case aborts the caller signal and asserts no further attempts. **(verified locally) Test-author gotcha:** in Node 24.21, a *mocked* `AbortSignal.timeout` aborts with reason name `AbortError`, while the real one gives `TimeoutError`. Hidden tests must not depend on the reason name under mock timers. Prefer an injected clock, or assert on the attempt count instead. In-memory.
- **Likelihood an LLM gets it wrong:** high. Per-attempt `AbortSignal.timeout` inside the loop is the default shape it writes.

### 5. Idempotency-key server: check-then-insert race, no fingerprint, no in-flight state
- **Mistake:** `const hit = await db.get(key); if (hit) return hit.response; const r = await doWork(); await db.put(key, r)`. Two concurrent retries both miss and both execute. The same key with a *different* body silently returns the old response. Keys are stored only after success, so a crash mid-work loses the record.
- **Correct:** Atomically claim the key first: `INSERT INTO idem(key, fingerprint, status) VALUES ($1,$2,'in_progress') ON CONFLICT (key) DO NOTHING RETURNING ...`. If nothing is returned, load the row. If the fingerprint differs, return **422**. If it is still `in_progress`, return **409**. If it is `done`, replay the stored status and body. The 400/422/409 codes are from the IETF draft-07 §2.7. Store the result in the same transaction as the business write when possible. Expire keys per a documented policy.
- **Source:** https://www.ietf.org/archive/id/draft-ietf-httpapi-idempotency-key-header-07.html (§2.4 fingerprint, §2.7 errors) ; https://brandur.org/idempotency-keys
- **Testable how:** An HTTP handler `createOrder(req)` sits over an injected store, where the fake store yields (`await setImmediate`) between read and write. The hidden test fires 2 concurrent identical requests and expects 1 order, with the second getting 409 or the replay. The same key with a different body expects 422. The same key after completion expects a byte-identical replay including status 201. It can be in-memory, or postgres:17 for a version with a real `ON CONFLICT`.
- **Likelihood an LLM gets it wrong:** high. The race is usually missed, and the 422/409 split is draft-specific knowledge.

### 6. Redis lock: release or extend without an ownership check (and outdated client syntax)
- **Mistake:** `await redis.del(key)` in `finally`. If your TTL expired and B now holds the lock, you delete B's lock. Renewal via `PEXPIRE key ttl` has the same bug. Old node-redis option shapes are also common: `{NX: true, PX: 30000}` is `@deprecated` in node-redis 5+/6.
- **Correct:** Acquire with `SET key <random token> NX PX ttl`. In node-redis 6.3: `client.set(key, token, {condition: 'NX', expiration: {type: 'PX', value: ttl}})`. Release only if the token matches. On **Redis ≥ 8.4** use `DELEX key IFEQ token` (returns 1/0); on older servers use the Lua compare-and-del script. Extend with `SET key token IFEQ token PX ttl`, which is 8.4+ and does *not* create a missing key, or with Lua.
- **Source:** https://redis.io/docs/latest/commands/delex/ ; https://redis.io/docs/latest/commands/set/ ; https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/ ; node-redis `@redis/client` SET.d.ts (v6.3.0)
- **Testable how:** Run against local Redis 8 (**verified locally:** `DELEX lk IFEQ other` → 0, `DELEX lk IFEQ tok` → 1). A acquires with TTL 100 ms and sleeps 150 ms. B acquires. A calls `release()`. Assert that B's key still exists with B's token, and that `extend()` by A returns false. Needs real Redis (installed).
- **Likelihood an LLM gets it wrong:** low for the token check, which is well known; med for using DELEX/IFEQ and the current node-redis option shape.

### 7. Lock without fencing: the paused holder still writes
- **Mistake:** A lock (Redis, Redlock, or a DB row with expiry) guards "only one writer", and the storage write doesn't check anything. A GC/stop-the-world pause or a slow network longer than the TTL lets two holders write. Correctness then relies on timing.
- **Correct:** Each acquisition returns a monotonically increasing **fencing token** (`INCR lock:fence`, a DB sequence, or an etcd/ZooKeeper revision or zxid). The resource rejects writes with a token lower than the highest it has seen, for example `UPDATE doc SET body=$1, fence=$2 WHERE id=$3 AND fence < $2` and treat rowCount 0 as rejected. Use Redlock only for efficiency locks, never for correctness.
- **Source:** https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html ; https://www.antirez.com/news/101
- **Testable how:** In-memory lock service plus storage with a fake clock. A acquires (token 1) and "pauses" (awaits a promise the test controls) past the TTL. B acquires (token 2) and writes. The test releases A, which writes. Assert storage holds B's value and A's write was rejected. The mistake version stores A's stale value. In-memory.
- **Likelihood an LLM gets it wrong:** med-high. It writes the lock correctly and forgets the resource-side check, or puts the check in the client, which is useless.

### 8. Durations and leases measured with the wall clock
- **Mistake:** `const start = Date.now(); ... if (Date.now() - start > ttl)` for lease validity, timeouts or rate windows. An NTP step backwards makes the lease look valid forever, and a step forward expires everything. A second mistake is comparing a remote server's timestamp to the local `Date.now()` to decide lease expiry ("lease expires at server time X").
- **Correct:** Use `performance.now()` or `process.hrtime.bigint()` for elapsed time. A lease is valid until `acquiredAtMonotonic + ttl - safetyMargin`, where `acquiredAt` is taken **before** sending the acquire request, so network delay eats into the lease and not past it. Never compare clocks across machines; take expiry as a duration. p-retry 8 measures `maxRetryTime` with `performance.now()` for this reason.
- **Source:** https://nodejs.org/docs/latest-v24.x/api/perf_hooks.html#performancenow ; https://blog.cloudflare.com/how-and-why-the-leap-second-affected-cloudflare-dns/ ; https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html
- **Testable how:** **(verified locally)** In Node 24, `t.mock.timers.enable({apis:['Date']})` plus `t.mock.timers.setTime(...)` moves `Date.now()` without touching `performance.now()`. Hidden test: acquire a lease with ttl 10 s, `setTime(Date.now() - 3600_000)` (clock steps back an hour), and advance real time past the TTL. Assert `isValid()` is false. A second case: the lease-acquire fake takes 400 ms to respond, ttl is 1000 ms and the margin is 0, so assert the lease is invalid at local-monotonic 700 ms after receipt. In-memory.
- **Likelihood an LLM gets it wrong:** med. `Date.now()` is the reflex in JS.

### 9. Outbox relay polls `WHERE id > $lastId` and loses late commits (and dual writes)
- **Mistake:** The basic dual write is `await db.insert(order); await kafka.send(evt)`. A crash in between loses the event, and publishing first then rolling back creates phantom events. The subtler version is an outbox table with `id bigserial` and a relay that remembers `lastId`. Tx A takes id 10 but commits after tx B (id 11). The relay sees 11, advances to 11, and **never** sees 10. Sequence order is not commit order, and sequences are not rolled back.
- **Correct:** Insert the outbox row in the *same* transaction as the business row. Relay option (a): claim unsent rows with `SELECT ... WHERE sent_at IS NULL ORDER BY id LIMIT n FOR UPDATE SKIP LOCKED`, publish, and mark them sent (no cursor, at-least-once). Option (b), for ordered reads with a cursor: add `tx_id xid8 NOT NULL DEFAULT pg_current_xact_id()`, read `WHERE (tx_id, id) > ($lastTx, $lastId) AND tx_id < pg_snapshot_xmin(pg_current_snapshot()) ORDER BY tx_id, id`. Option (c): CDC via logical replication (Debezium).
- **Source:** https://event-driven.io/en/ordering_in_postgres_outbox/ ; https://microservices.io/patterns/data/transactional-outbox.html ; https://www.postgresql.org/docs/17/functions-info.html#FUNCTIONS-PG-SNAPSHOT
- **Testable how:** Use postgres:17 in docker. The test opens client1, runs `BEGIN`, inserts an outbox row (gets id N) and leaves it open. Client2 inserts and commits (id N+1). Run `relay.pollOnce()`. Commit client1. Run `relay.pollOnce()` again. Assert the fake publisher received both events. The cursor-on-id version loses N. Needs real Postgres; this race cannot be faked honestly.
- **Likelihood an LLM gets it wrong:** high. "Poll by id greater than last" is the textbook outbox relay LLMs write.

### 10. Idempotent consumer: dedupe outside the transaction, or check-then-act
- **Mistake:** `if (await redis.sismember('seen', id)) return; await applyEffect(); await redis.sadd('seen', id)`. A crash after the effect and before `sadd` causes a duplicate on redelivery, and two concurrent redeliveries both pass the check. Some code marks the message seen *before* applying the effect, so a crash loses it.
- **Correct:** In one DB transaction: `INSERT INTO processed_messages(consumer, message_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`. If `rowCount === 0`, the message is a duplicate, so commit and ack. Otherwise apply the effect in the same transaction, commit, *then* ack. The dedupe key is the producer's stable message id, not the broker offset or delivery tag. Alternatively, make the effect naturally idempotent, for example an upsert keyed by business id.
- **Source:** https://microservices.io/patterns/communication-style/idempotent-consumer.html ; https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html
- **Testable how:** Use postgres:17. The handler `onPaymentCaptured(msg)` increments a balance. Hidden tests: (1) deliver the same message twice concurrently (`Promise.all`) and expect a balance of +1×. (2) Inject a crash (throw) after the effect but before the ack, redeliver, and expect +1×. (3) Inject a throw *inside* the effect and expect the message to be reprocessable, with the balance ending at +1× after redelivery. An in-memory fake transaction works for (1) and (2), but Postgres is more honest.
- **Likelihood an LLM gets it wrong:** med. It knows "dedupe table" but often puts it outside the transaction or in Redis.

### 11. Kafka: committing the processed offset instead of offset+1, or acking before processing finishes
- **Mistake:** `consumer.commitOffsets([{topic, partition, offset: message.offset}])` after processing, which re-delivers the last message on every restart. `eachMessage: async ({message}) => { handle(message) }` without `await` lets auto-commit (periodic in the Confluent client, default 5 s) commit work that never finished. `Number(message.offset)` loses precision for offsets above 2^53.
- **Correct:** The committed offset is the **next** offset to read: `(BigInt(message.offset) + 1n).toString()`. Kafka's KafkaConsumer javadoc says the committed offset "should be the next message your application will consume". Await all processing inside `eachMessage`. For at-least-once with manual control, set `autoCommit: false` (top-level consumer config in `@confluentinc/kafka-javascript`, not in `run()`), and commit after the effect is durable. KafkaJS 2.2.4 has had no release since Feb 2023; the maintained KafkaJS-compatible client is `@confluentinc/kafka-javascript` 1.11.0 (librdkafka-based). Note `eachBatch` there yields batches of size 1.
- **Source:** https://kafka.apache.org/documentation/#consumerapi (KafkaConsumer javadoc, Offsets and Consumer Position) ; https://docs.confluent.io/kafka-clients/javascript/current/migration.html ; https://www.npmjs.com/package/kafkajs
- **Testable how:** Option 1, in-memory: a fake consumer implementing the KafkaJS-shaped `run({eachMessage})` and `commitOffsets`, with a log of 5 messages. Process 3, "restart", and assert resume starts at offset 3 and no message is processed twice. A handler with a slow un-awaited effect must not have its offset committed before the effect resolves. Option 2: apache/kafka:4.3.1 KRaft single node for a real run.
- **Likelihood an LLM gets it wrong:** med-high. The off-by-one is very common, as is picking KafkaJS by default.

### 12. Redis Streams consumer only reads `>` and never recovers pending entries
- **Mistake:** `XREADGROUP GROUP g c1 COUNT 10 BLOCK 5000 STREAMS s >` in a loop, with `XACK` after processing. If c1 crashes mid-message, that entry sits in c1's Pending Entries List forever: `>` returns only never-delivered entries, and a dead consumer's PEL is never claimed. A poison message is retried forever, with no dead-letter queue.
- **Correct:** On start, first read your own PEL with ID `0` until it is empty, then switch to `>`. Periodically run `XAUTOCLAIM s g <me> <min-idle-ms> 0-0 COUNT n` to steal entries from dead consumers. Use the delivery count (`XPENDING` extended form) to dead-letter after N tries. In Redis ≥ 8.2, `XACKDEL` acks and deletes atomically, and `XADD`/`XTRIM` take `KEEPREF|DELREF|ACKED` (default `KEEPREF`) so trimming doesn't leave dangling PEL refs.
- **Source:** https://redis.io/docs/latest/develop/data-types/streams/ ; https://redis.io/docs/latest/commands/xautoclaim/ ; https://redis.io/docs/latest/develop/whats-new/8-2/
- **Testable how:** Use local Redis 8. Consumer c1 reads 1 entry and "crashes" (stops without XACK). Hidden test (1): restart c1 and assert it processes that entry. Test (2): start c2 with `minIdle=50ms` and wait 100 ms, then assert c2 processed it. Test (3): a poison entry that always throws is moved to `s:dlq` after 3 deliveries. Needs real Redis (installed).
- **Likelihood an LLM gets it wrong:** med-high. The happy-path loop is what tutorials show; PEL recovery is an afterthought.

### 13. Leader election with `pg_try_advisory_lock` through a connection pool
- **Mistake:** `await pool.query('SELECT pg_try_advisory_lock(42)')`, and later `pool.query('SELECT pg_advisory_unlock(42)')`. Session-level advisory locks belong to the *backend connection*. The unlock may run on a different pooled connection, so it returns false and warns while the lock stays held by an idle pooled connection. The pool's `idleTimeoutMillis` can close the holding connection, silently dropping leadership while the app still believes it is leader. Session locks also break under PgBouncer transaction pooling.
- **Correct:** Take `const client = await pool.connect()` (or a dedicated `new pg.Client`) and hold it for the whole leadership term. Lock and unlock on that client. Treat `client.on('error')`/`'end'` as leadership loss, stop leader work, and re-campaign. Combine with a fencing token (trap 7) for writes. For short jobs, use `pg_advisory_xact_lock` inside one transaction instead.
- **Source:** https://www.postgresql.org/docs/17/explicit-locking.html#ADVISORY-LOCKS ; https://www.pgbouncer.org/features.html ; https://node-postgres.com/apis/pool
- **Testable how:** Use postgres:17 and `pg` 8.23. Two `Elector` instances use separate pools (max 3). A becomes leader and calls `resign()`, then assert B's `campaign()` succeeds within 200 ms. The pooled mistake leaves the lock held, so B fails. Second case: kill A's backend with `pg_terminate_backend(pid)` from the test, then assert A emits `leadershipLost` and B can acquire. Needs real Postgres.
- **Likelihood an LLM gets it wrong:** high. `pool.query` for everything is its default node-postgres style.

### 14. Circuit breaker that counts client errors, floods half-open, or doesn't cancel on timeout
- **Mistake:** A hand-rolled breaker that (a) counts 4xx/validation errors as failures, so bad user input opens the circuit for everyone; (b) lets *every* concurrent call through in half-open, so the recovering service gets the full herd; (c) opens on 1 failure out of 1 call (no minimum volume); (d) uses a timeout that rejects the promise while the underlying request keeps running and holding sockets.
- **Correct:** Count only infrastructure failures (timeouts, 5xx, connection errors). Require a minimum number of calls in a rolling window before opening. Half-open admits one probe (or N), and the rest fail fast until it resolves. Abort the underlying operation on timeout. With opossum 10.0.0: `errorFilter: e => e.status >= 400 && e.status < 500` (filtered errors don't count), `volumeThreshold`, `rollingCountTimeout`/`rollingCountBuckets`, `resetTimeout`, and `abortController` (+ `autoRenewAbortController`) so the timeout cancels the call. cockatiel 4.0.0 is the alternative (`ConsecutiveBreaker`/`SamplingBreaker`, `handleWhen`).
- **Source:** https://github.com/nodeshift/opossum (README, v10.0.0) ; https://martinfowler.com/bliki/CircuitBreaker.html ; https://github.com/connor4312/cockatiel
- **Testable how:** Implement `CircuitBreaker` with an injected clock. Hidden tests: (1) 20 calls that throw `{status: 422}` leave it closed. (2) After opening and `resetTimeout`, fire 10 concurrent calls and expect the downstream fake to see exactly 1. (3) On a timeout, the downstream fake's `signal.aborted` is true. In-memory with fake timers.
- **Likelihood an LLM gets it wrong:** med-high. (b) and (d) are missed in most hand-written versions.

### 15. No backpressure: ignoring `write()` false, unbounded `Promise.all`, unbounded queues
- **Mistake:** `for (const row of rows) out.write(serialize(row))`, ignoring the boolean, so memory grows to the whole dataset. `await Promise.all(ids.map(callDownstream))` over 50k ids opens 50k concurrent requests. An in-process job queue with no limit keeps accepting work while latency climbs (queueing collapse).
- **Correct:** Use `if (!out.write(chunk)) await once(out, 'drain')`, or better `await pipeline(source, transform, out)` from `node:stream/promises`. Bound concurrency (a semaphore / p-limit, or `Readable.from(ids).map(fn, {concurrency: 8})`). Bound queues and shed load early with 503/429 + `Retry-After` rather than queueing unbounded.
- **Source:** https://nodejs.org/en/learn/modules/backpressuring-in-streams ; https://nodejs.org/docs/latest-v24.x/api/stream.html#readablemapfn-options
- **Testable how:** In-memory. (1) A slow Writable (highWaterMark 16 KiB, each write completes after 1 ms) receives 10k rows of 1 KiB. Sample `out.writableLength` and assert it never exceeds about 2× highWaterMark. (2) `fetchAll(ids, fn)` with a fake `fn` that tracks in-flight count, asserting max in-flight ≤ 8. (3) A `JobQueue({max: 100})` rejects the 101st `enqueue` with a `QueueFull` error.
- **Likelihood an LLM gets it wrong:** med. It knows `pipeline` but writes `Promise.all` over the full list by habit.

### 16. Saga compensates only "completed" steps, best-effort, in the wrong order
- **Mistake:** `try { await reserve(); await charge(); await ship() } catch { for (const s of done) await s.undo().catch(log) }`. The bugs are: (a) `charge()` *timed out* but actually succeeded, and since it isn't in `done` it is never refunded; (b) compensations are swallowed on failure (logged, not retried), leaving money taken; (c) forward order instead of reverse; (d) saga state lives only in memory, so a process crash mid-saga leaves it half-done forever; (e) compensations are not idempotent, so a retry refunds twice.
- **Correct:** Persist saga state before each step. Mark a step "attempted" before calling it, and compensate attempted steps too (an unknown outcome counts as possibly done). Compensate in reverse order. Each compensation is idempotent (keyed by saga id + step) and retried with backoff until it succeeds or is escalated, never silently dropped. Forward steps use idempotency keys derived from the saga id, so a resumed saga doesn't repeat effects. Engines like Temporal persist this for you.
- **Source:** https://microservices.io/patterns/data/saga.html ; https://www.cs.cornell.edu/andru/cs711/2002fa/reading/sagas.pdf (Garcia-Molina & Salem, 1987) ; https://docs.temporal.io/encyclopedia/detecting-activity-failures
- **Testable how:** In-memory fake services `inventory`, `payments` and `shipping` with ledgers. Hidden tests: (1) `payments.charge` records the charge then throws `TimeoutError`, and the saga fails; assert the payments net balance is 0 and the inventory reservation is released. (2) `payments.refund` fails twice then succeeds, and the refund must eventually apply exactly once. (3) Compensation order is recorded as `['refund','release']`. (4) Simulate a crash after step 2 by persisting the store and creating a new orchestrator that calls `resume(sagaId)`, then assert it completes or compensates with no double charge.
- **Likelihood an LLM gets it wrong:** high. Compensating the timed-out step and retrying compensations are almost always missing.

### Not covered (honest gaps)
- **Consistency models / read-your-writes on replicas** (PACELC "else latency") needs a primary-plus-replica Postgres setup (two containers plus replication). It is feasible but heavy, and left out on purpose.
- **Postgres SERIALIZABLE retry on SQLSTATE `40001`/`40P01`, re-running the whole transaction:** this is a good trap, but LLMs mostly know it. It is a candidate if the 16 above are too many.
- **SQS visibility timeout vs processing time** (localstack): similar to trap 12, so skipped.

## Versions checked

| Thing | Version (2026-10-12) | Source |
|---|---|---|
| Node.js (local) | 24.21.0 (Active LTS line). `AbortSignal.timeout` mockable via `mock.timers` `apis:['AbortSignal.timeout']` (verified locally) | `node --version`; https://github.com/nodejs/node/pull/60751 |
| Node http server defaults | keepAliveTimeout 5000, headersTimeout 60000, requestTimeout 300000, keepAliveTimeoutBuffer 1000, globalAgent keepAlive true (verified locally) | https://nodejs.org/docs/latest-v24.x/api/http.html |
| undici | 8.11.2 | `npm view undici` |
| Redis server (local) | 8.10.2. DELEX / SET IFEQ / DIGEST since 8.4. XACKDEL / XDELEX / KEEPREF\|DELREF\|ACKED since 8.2 | `redis-server --version`; https://redis.io/docs/latest/commands/redis-8-4-commands/ ; https://redis.io/docs/latest/develop/whats-new/8-2/ |
| node-redis (`redis`) | 6.3.0. SET `{condition, expiration}` with `NX`/`PX` deprecated; supports `IFEQ` | `npm view redis`; `@redis/client` SET.d.ts |
| ioredis | 6.0.0 (published 2026-10-12, very fresh) | `npm view ioredis` |
| PostgreSQL | 17.11 / 18.6 current minors (2026-08-13). 19 GA planned 2026-10-29 | https://www.postgresql.org/ ; https://www.postgresql.org/developer/roadmap/ |
| pg (node-postgres) | 8.23.1 | `npm view pg` |
| Apache Kafka | 4.3.1 latest (2026-06-25), KRaft only since 4.0 | https://kafka.apache.org/community/downloads/ |
| @confluentinc/kafka-javascript | 1.11.0 | `npm view @confluentinc/kafka-javascript` |
| kafkajs | 2.2.4, last publish 2023-02 (effectively unmaintained) | `npm view kafkajs` |
| opossum | 10.0.0 | `npm view opossum`; https://github.com/nodeshift/opossum |
| cockatiel | 4.0.0 | `npm view cockatiel` |
| p-retry | 8.0.1 (randomize default false, retries 10, maxRetryTime monotonic) | `npm view p-retry`; readme |
| Idempotency-Key header | draft-ietf-httpapi-idempotency-key-header-07 (2025-10-15, expired I-D, not an RFC) | https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/ |
| @aws-sdk/client-sqs | 3.1150.0 | `npm view @aws-sdk/client-sqs` |

Local docker currently has only `postgres:16` pulled. `postgres:17` and `apache/kafka:4.3.1` must be pulled before the eval runs.
