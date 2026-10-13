# Knowledge brief: Redis 8 and caching (slug: redis-caching)

Researched 2026-10-12. Every behaviour marked **[verified locally]** was run
against redis-server 8.10.2, `redis@6.3.0` (node-redis) and `ioredis@6.0.0` on
Node 24.21.0 in a scratch project, not taken from memory.

**Headline for the eval author.** The brief asked about "node-redis v5". That is
out of date. **node-redis is on v6** (6.0.0 in May 2026, 6.3.0 on npm now) and
**ioredis is on v6** (2026-07-31). **Both now default to RESP3.** An LLM trained
before mid-2026 will write v5-era code and v5-era assumptions. Several traps
below exist because of that.

## Mental model

1. Redis is a shared, fast, forgetful map. Treat everything in it as something that can disappear at any moment (TTL, eviction, restart).
2. Cache-aside: read the cache, on a miss read the DB and fill the cache. Write-through: every write goes to the DB and the cache together. Most apps use cache-aside, with a delete on write.
3. "Delete the cache after writing the DB" still has a race. A slow reader can put an old value back after your delete. A TTL is the safety net that bounds how long that stale value lives.
4. A stampede happens when a hot key expires and a thousand requests all rebuild it at once. Fixes: one rebuilder (a lock or single-flight), or refreshing a little early at random (XFetch).
5. Give TTLs random jitter so keys written together don't all expire together.
6. Cache "not found" too (negative caching), with a shorter TTL, so missing rows don't hammer the DB.
7. A Redis lock is `SET key token NX PX ttl`. Release it only if the token is still yours: `DELEX key IFEQ token` (Redis 8.4+) or a Lua compare-and-delete. A lock can expire while you still think you hold it, so protect real writes with fencing tokens.
8. Pub/sub is fire-and-forget: if nobody is listening, the message is gone. Streams with consumer groups are the durable queue: read, process, `XACK`, and reclaim stuck messages.
9. MULTI is not a rollback transaction: if one command fails, the others still apply. A pipeline is only batching and gives no atomicity.
10. Default eviction is `noeviction`, so a full Redis rejects writes instead of dropping keys. `volatile-*` policies only evict keys that have a TTL.
11. Big keys block the server (use `UNLINK`, `SCAN`, never `KEYS`). Hot keys overload one node (Redis 8.6 adds `HOTKEYS` to find them).
12. HTTP caching is the same idea at the edge: `ETag` + `If-None-Match` → `304`, and `no-cache` means "revalidate", not "don't store".

## Traps

Shared test harness (all traps that say "real Redis"): Redis cannot pick its own
free port, so a `before()` hook picks one in Node (`net.createServer().listen(0)` → read the port → close), then spawn
`redis-server --port <p> --save "" --appendonly no` (plus per-test flags such as
`--maxmemory`), poll `PING` until it answers, and `SHUTDOWN NOSAVE` in `after()`.
Note that `redis-cli` and the server write `dump.rdb` into the cwd unless
`--save ""` is passed.

### 1. Plain `SET` on an existing key silently drops its TTL

- **Mistake:** Refreshing a cached value with `client.set(key, json)` (no expiry option) after it was first written with `EX`. The key now lives forever and the "TTL safety net" from the mental model is gone. A common form is a "touch/update" path, or a write-through `update()` that forgets the expiry.
- **Correct:** Every `SET` of a cache key passes an expiry (`{ expiration: { type: 'EX', value } }` in node-redis v5/v6), or `KEEPTTL` when you really mean "keep the old TTL". **[verified locally]** `SET t a EX 100; SET t b; TTL t` → `-1`.
- **Source:** https://redis.io/docs/latest/commands/set/ (KEEPTTL; "Any previous time to live associated with the key is discarded on successful SET operation").
- **Testable how:** Real Redis. Hidden test calls `cache.get()` (fills), then `cache.update()`, then asserts `PTTL key > 0`. An in-memory fake works only if it models "SET clears TTL", and most fakes don't, so use real Redis.
- **Likelihood an LLM gets it wrong:** **High.** The happy-path tests pass. The bug only shows as `TTL == -1`, which nobody asserts.

### 2. Lock release with GET-then-DEL (or plain DEL)

- **Mistake:** `if (await get(key) === token) await del(key)`, or just `del(key)`. If the lock expired during your work and another client took it, you delete *their* lock. The GET+DEL version also has a gap between the two calls.
- **Correct:** Atomic compare-and-delete. On Redis ≥ 8.4: `DELEX key IFEQ token` (node-redis: `client.delEx(key, { condition: 'IFEQ', matchValue: token })`, the command exists in 6.x). On older servers: the Lua script `if redis.call("get",KEYS[1]) == ARGV[1] then return redis.call("del",KEYS[1]) else return 0 end`. The token must be unique per acquisition (`crypto.randomUUID()`), not a constant or a hostname. **[verified locally]** `DELEX lock IFEQ wrongtoken` → 0, `IFEQ righttoken` → 1.
- **Source:** https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/ (now shows DELEX first, Lua as the pre-8.4 fallback); https://redis.io/docs/latest/commands/delex/
- **Testable how:** Real Redis. Client A acquires with PX 100 ms, sleeps 150 ms; client B acquires; A calls `release()`. Assert B's key still exists with B's token. A fake can do this too if it implements PX expiry, but real Redis is cheap.
- **Likelihood an LLM gets it wrong:** **Medium.** The Lua pattern is well known, but an LLM asked to write `withLock()` quickly often writes `finally { del(key) }`. Almost none will know `DELEX` (Redis 8.4, Nov 2025).

### 3. Lock holder outlives its TTL with no fencing token (Redlock caveat)

- **Mistake:** Treating "I acquired the lock" as "I am still the only writer". A GC pause or a slow call outlasts the TTL, a second client takes the lock, and both write. Redlock (5 nodes) does not fix this. Neither does a correct release.
- **Correct:** The lock hands out a monotonically increasing fencing token (for example `INCR lock:fence` at acquire time). The protected resource rejects writes whose token is lower than the highest it has seen. Long jobs extend the lock (compare-and-`PEXPIRE`) and check they still hold it before committing.
- **Source:** https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html ; Redis's own page now says "You should implement fencing tokens" and warns that TTL uses wall-clock time, not a monotonic clock: https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/#disclaimer-about-consistency
- **Testable how:** Redis for the lock, plus an **in-memory fake "storage service"** that records the max token seen. Test: A acquires (token 1) with PX 50, awaits an injected `pause()` of 100 ms; B acquires (token 2) and writes; A resumes and writes. Assert final value is B's and A's write was rejected.
- **Likelihood an LLM gets it wrong:** **Medium-high.** Ask for "a distributed lock helper" and you get acquire/release with no fencing. Fencing appears only if the prompt mentions correctness.

### 4. Cache-aside delete-after-write race (stale value put back)

- **Mistake:** Believing "update DB, then `DEL` cache" is always consistent. Interleaving: reader misses → reads DB (old) → writer updates DB → writer DELs cache → reader SETs old value. Now the cache is stale until TTL, forever if there is no TTL (see trap 1). Variants: deleting *before* the DB write (worse), or updating the cache instead of deleting it (two concurrent writers can land out of order).
- **Correct:** Always delete (not set) on write, and always keep a TTL as the bound. To actually close the race, use a version or lease: store `{v, data}` and have the filler only write if nobody invalidated since it read. With Redis ≥ 8.4 this can be `SET key new IFEQ <expected>`. Before 8.4, use a Lua check on a version field, or Facebook-style leases: the miss hands out a lease token, and a delete invalidates it. A "delayed double delete" narrows the window but does not close it.
- **Source:** Facebook "Scaling Memcache at Facebook", §3.2.1 Leases: https://www.usenix.org/system/files/conference/nsdi13/nsdi13-final170_update.pdf ; SET IFEQ: https://redis.io/docs/latest/commands/set/
- **Testable how:** Real Redis plus an **in-memory fake DB with hooks** (`onAfterRead` promise the test controls) to force the exact interleaving. Assert that after the writer finishes and the reader finishes, `cache.get()` returns the new value (or a miss), never the old one. Also assert `PTTL > 0`.
- **Likelihood an LLM gets it wrong:** **High.** Nearly every generated cache-aside shows "write DB then delete key" and calls it done. Ask it to "make it race-free" and it usually suggests a double delete with a sleep.

### 5. Stampede: no single-flight, or XFetch with the wrong sign

- **Mistake:** (a) N concurrent misses on a hot key cause N DB loads. (b) When implementing probabilistic early expiry (XFetch), people write `now + delta*beta*Math.log(Math.random()) >= expiry`. `log(rand)` is negative, so that version *never* refreshes early. Another bug is forgetting to store `delta` (how long the recompute took) next to the value.
- **Correct:** (a) An in-process single-flight map (`Map<key, Promise>`) collapses concurrent loads within one process. Across processes, one rebuilder takes a short `SET lock NX PX` while the others serve stale data or wait and retry. (b) XFetch: recompute if `now - delta * beta * Math.log(Math.random()) >= expiry` (note the **minus**), with beta ≈ 1, and store `delta` and `expiry` with the value.
- **Source:** Vattani, Chierichetti, Lowenstein, "Optimal Probabilistic Cache Stampede Prevention", VLDB 2015: https://cseweb.ucsd.edu/~avattani/papers/cache_stampede.pdf
- **Testable how:** **In-memory fake suffices** for both. (a) 100 concurrent `get()` with a loader that counts calls and awaits 50 ms → assert loader called once (per process). (b) Inject `random` and `now`. With `random = () => 0.01`, near (not at) expiry → assert early refresh happens. With `random = () => 0.999999`, far from expiry → assert no refresh.
- **Likelihood an LLM gets it wrong:** **Medium.** Single-flight is usually remembered when asked about stampedes. The XFetch sign and `delta` storage are easy to get wrong when written from memory.

### 6. Negative caching: missing rows not cached, or `null` confused with "miss"

- **Mistake:** (a) Not caching "not found", so every request for a missing ID hits the DB (a penetration attack). (b) Caching it as `''` / `'null'` and then using `if (!cached)`, which treats the cached-negative as a miss. (c) Using node-redis `hGetAll` for a hash-shaped cache and checking `if (!obj)`. A missing hash returns `{}`, not `null`, so a miss looks like a hit with no fields.
- **Correct:** Store an explicit sentinel (for example `"__nf__"`) with a *shorter* TTL than positive entries. Check `cached === null` for a miss. For hashes, check `Object.keys(obj).length === 0` (or use `EXISTS`). **[verified locally]** both clients: `hGetAll('nope')` → `{}`.
- **Source:** node-redis `HGETALL` reply type (an object), https://github.com/redis/node-redis/blob/master/packages/client/lib/commands/HGETALL.ts ; general pattern: https://redis.io/docs/latest/develop/clients/client-side-caching/ (not specific). The main evidence is the local run.
- **Testable how:** Real Redis (for the `{}` behaviour) or a fake. Loader returns `null` for id 404. Call `get(404)` 10 times → assert loader called once, `PTTL` of the negative key < positive TTL, and the return value is `null` (not `''`, not `{}`).
- **Likelihood an LLM gets it wrong:** **Medium.** (a) is often forgotten unless prompted. (c) catches most models, which assume a miss is `null`.

### 7. TTL jitter missing (synchronized expiry)

- **Mistake:** A bulk warm-up or a batch import sets 10k keys with `EX 3600`. They all expire in the same second and cause a thundering herd.
- **Correct:** `ttl = base + randomInt(0, base * 0.1)` (or ± jitter), with the random source injectable for tests.
- **Source:** Redis caching guidance (stampede section) https://redis.io/docs/latest/develop/clients/patterns/ (general). The principle is folklore. Grade it by behaviour, not citation.
- **Testable how:** Real Redis or a fake. Warm 200 keys, read every `PTTL`, assert spread (max-min) ≥ 5% of base and all within [base, base*1.2].
- **Likelihood an LLM gets it wrong:** **Medium.** It knows the idea when asked, but rarely adds it unprompted to `set()`.

### 8. Sliding-window rate limiter: same-millisecond requests collapse, and rejected requests counted

- **Mistake:** A ZSET log limiter doing `ZADD key now now` (member = timestamp). Two requests in the same millisecond share one member, so the second overwrites the first and the limiter lets through more than the limit. Other common bugs: running ZREMRANGEBYSCORE / ZCARD / ZADD as separate round trips (check-then-act race under concurrency), adding the entry even when rejecting (a client that keeps retrying is locked out forever), and no `PEXPIRE` on the key.
- **Correct:** Do it atomically (a Lua script, or `MULTI` but then the decision happens after the add). Use a unique member (`${now}-${randomUUID()}` or `${now}-${INCR seq}`), only `ZADD` when allowed, and `PEXPIRE key window`. For a fixed window on Redis ≥ 8.8, the native `INCREX key BYINT 1 UBOUND <limit> EX <win> ENX` returns `[value, appliedIncrement]`, and applied = 0 means rejected.
- **Source:** https://redis.io/docs/latest/commands/zadd/ (members are unique); https://redis.io/docs/latest/commands/increx/ (new in 8.8, includes the rate-limiter pattern)
- **Testable how:** Real Redis (Lua and ZSET semantics matter). `Promise.all` of 20 `allow('u1')` calls with an injected clock frozen at one ms value, limit 10 → assert exactly 10 `true`. Then advance the clock by the window → assert allowed again. Then assert `ZCARD` ≤ limit after a burst of rejects.
- **Likelihood an LLM gets it wrong:** **High** for the same-ms member collision (the canonical blog snippet does `ZADD key now now`). Medium for atomicity.

### 9. Fixed-window INCR + EXPIRE: TTL reset on every hit, or never set

- **Mistake:** `INCR key; EXPIRE key 60` on *every* request, which pushes the window forward forever (a steady client never resets). Or `if (count === 1) EXPIRE`, which is non-atomic: a crash or connection drop between the two calls leaves a counter with no TTL that blocks the user permanently.
- **Correct:** `EXPIRE key 60 NX` (Redis ≥ 7.0, only sets when no TTL) in the same `MULTI`, or a Lua script, or on Redis ≥ 8.8 `INCREX ... EX 60 ENX`. **[verified locally]** node-redis `client.expire(k, 10, 'NX')` → 1 first time.
- **Source:** https://redis.io/docs/latest/commands/expire/ (NX/XX/GT/LT options, since 7.0); https://redis.io/docs/latest/commands/increx/
- **Testable how:** Real Redis with a short window (1 s). Hit at t=0, t=0.6 s, t=1.2 s with limit 2 → third must be allowed (window reset). Plus a "crash" test: inject a failure after INCR (wrap the client), then assert the key still has a TTL.
- **Likelihood an LLM gets it wrong:** **Medium-high.** The `if (count === 1)` version is the most common snippet online.

### 10. Streams: restarted consumer reads `>` and never sees its own un-ACKed messages; XAUTOCLAIM not looped

- **Mistake:** (a) A worker crashes after `XREADGROUP ... >` and before `XACK`. On restart it reads `>` again and gets nothing back: its pending messages sit in the PEL forever. (b) A reclaimer calls `XAUTOCLAIM` once (it is cursor-based and returns `nextId`) and ignores `deletedMessages`. (c) No poison-message handling: XAUTOCLAIM increments the delivery count every time, so a message that always fails is retried forever. (d) Forgetting `XACK` entirely, so the PEL grows without bound.
- **Correct:** On start, first drain your own history with ID `0` until it returns empty, then switch to `>`. The reclaimer loops `XAUTOCLAIM` from `0-0` until `nextId === '0-0'`, and dead-letters entries whose delivery count (`XPENDING` extended form) passes N. Redis ≥ 8.4 alternative: `XREADGROUP ... CLAIM <min-idle-ms>` returns idle pending entries together with new ones. Each claimed entry then carries two extra fields (idle ms, delivery count), so naive parsers break. Redis 8.8 adds `XNACK` to hand a message back without ACKing it. **[verified locally]** read `>` after "crash" → `null`; read `0` → the pending message; `XAUTOCLAIM` bumped delivery count to 2.
- **Source:** https://redis.io/docs/latest/commands/xreadgroup/ ; https://redis.io/docs/latest/commands/xautoclaim/ ; https://redis.io/docs/latest/develop/data-types/streams/ ; https://redis.io/docs/latest/develop/whats-new/8-4/ (CLAIM); https://redis.io/docs/latest/develop/whats-new/8-8/ (XNACK)
- **Testable how:** Real Redis. Test 1: worker reads one message, test kills it (no ACK), a new worker with the **same consumer name** starts → assert the message is processed exactly once more. Test 2: 250 pending messages idle > minIdle, reclaimer with `COUNT 100` → assert all 250 reclaimed. Test 3: handler always throws → after N deliveries the message lands in `dead:stream` and is ACKed.
- **Likelihood an LLM gets it wrong:** **High** for (a). Generated workers almost always loop on `>` only. Medium for (b)/(c).

### 11. Pub/sub used as a reliable queue

- **Mistake:** Using `PUBLISH`/`SUBSCRIBE` for cache-invalidation fan-out or jobs and assuming a briefly disconnected subscriber gets the messages later. It doesn't. Delivery is at-most-once, and `PUBLISH` returns the number of receivers *right now* (0 = dropped). A second mistake goes the other way. With RESP3 (now the default in **both** clients' v6), a subscribed connection can still run normal commands. Code that `duplicate()`s "because subscribe takes over the connection" is fine. But tests that *expect* an error from running GET on a subscriber now fail. **[verified locally]** `GET` on a subscribed connection works in node-redis 6.3 and ioredis 6.0 (RESP3). `PUBLISH` with no subscribers → 0.
- **Correct:** Pub/sub only for "best effort, now" signals. Anything that must arrive uses Streams (trap 10). For local caches, after reconnect assume you missed invalidations and flush the local cache (node-redis client-side caching / `CLIENT TRACKING` does this for you).
- **Source:** https://redis.io/docs/latest/develop/pubsub/ ("at-most-once message delivery semantics"); https://github.com/redis/node-redis/blob/master/docs/pub-sub.md (RESP2-only "takes over the connection" note)
- **Testable how:** Real Redis. A local-L1 + Redis-L2 cache uses pub/sub invalidation. The test disconnects the subscriber (`CLIENT KILL TYPE pubsub`), publishes an invalidation, the client reconnects → assert the L1 entry is not served stale (requires flush-on-reconnect).
- **Likelihood an LLM gets it wrong:** **Medium.** The at-most-once property is fairly well known. Flush-on-reconnect for L1 caches is usually missed.

### 12. MULTI treated as rollback-on-error, and the two clients report MULTI errors differently

- **Mistake:** Assuming that if one command in `MULTI` fails at runtime (WRONGTYPE), nothing was applied. Also assuming both clients surface it the same way. **[verified locally]** `MULTI; SET a 1; LPUSH a x; SET b 2; EXEC` → `SET b` **applied**. node-redis 6.x: `exec()` **rejects** with `MultiErrorReply` (`.replies`, `.errorIndexes`) even though the other commands ran. ioredis 6.x: `exec()` **resolves** to `[[null,'OK'],[ReplyError,…],[null,'OK']]`, so code that only `try/catch`es never sees the failure. Also: a pipeline (`execAsPipeline()` / `ioredis.pipeline()`) is not atomic at all. In node-redis, `execAsPipeline` rejects unwritten commands on disconnect, while `Promise.all` would retry them after reconnect.
- **Correct:** Validate types or keys up front, or use Lua when you need all-or-nothing on error. With ioredis, inspect every `[err, res]` tuple. With node-redis, catch `MultiErrorReply` and remember that partial effects happened. Use `WATCH` for optimistic concurrency, on a dedicated connection (WATCH state is per connection: use `createClientPool` / `duplicate()`).
- **Source:** https://redis.io/docs/latest/develop/using-commands/transactions/ ("Redis does not support rollbacks"); https://github.com/redis/node-redis/blob/master/docs/transactions.md ; ioredis README "Transaction" section https://github.com/redis/ioredis#transaction
- **Testable how:** Real Redis. Ask the candidate for a client-agnostic `transfer()` or `setMany()` that "must report failure". Hidden test pre-seeds a wrong-type key → assert the function reports failure (throws or returns `ok:false`) **and** run it against both clients.
- **Likelihood an LLM gets it wrong:** **High** for the ioredis tuple shape and the "no rollback" fact together. A generated wrapper usually does `await multi.exec()` and returns success.

### 13. node-redis v5/v6 vs ioredis API shapes (camelCase, options objects, SCAN cursor is a string)

- **Mistake:** Mixing the APIs: `client.hgetall` on node-redis (it is `hGetAll`), `set(k, v, 'PX', 100, 'NX')` on node-redis (that's ioredis positional style; node-redis takes `{ condition: 'NX', expiration: { type: 'PX', value: 100 } }`. The `{ NX: true, PX: 100 }` form still works but is `@deprecated`), `eval(script, 1, key, arg)` on node-redis (it is `eval(script, { keys, arguments })`), forgetting `await client.connect()` and the `'error'` listener on node-redis (ioredis connects by itself), `quit()` vs v5+ `close()`/`destroy()`. **The sharpest one:** node-redis v5+ `scan()` returns `{ cursor: string, keys }`, so `while (cursor !== 0)` is an **infinite loop**. `scanIterator()` yields **arrays** of keys (v5+), not single keys, so `del(key)` inside the loop gets an array. **[verified locally]** `typeof r.cursor === 'string'` ("60"); scanIterator yielded `array of 50`.
- **Correct:** Follow the client's own README. Loop `do { … } while (cursor !== '0')` or use `scanIterator()` and treat each item as a batch (`await client.unlink(batch)`).
- **Source:** https://github.com/redis/node-redis/blob/master/docs/v4-to-v5.md (SCAN cursor not converted to number; scanIterator yields arrays; close/destroy); https://github.com/redis/node-redis/blob/master/packages/client/lib/commands/SET.ts (new `condition`/`expiration` options; old flags deprecated)
- **Testable how:** Real Redis. `invalidatePrefix('user:')` with 1,000 matching keys and 1,000 non-matching → assert exactly the matching ones are gone, completed in < 2 s (catches the infinite loop via `node --test --test-timeout`), and the key list was never fetched via `KEYS` (wrap `sendCommand` / check `INFO commandstats` for `cmdstat_keys`).
- **Likelihood an LLM gets it wrong:** **High.** v4 code (numeric cursor, single-key iterator) dominates training data.

### 14. v6 RESP3 default changes reply types

- **Mistake:** Code or tests written against v5 / RESP2 types. In node-redis v6, RESP3 doubles arrive as `number`: `zScore` → `1.5` (number), GEO distances/coords are numbers now, and object replies (`hGetAll`, `XRANGE` messages) are plain objects, no longer `Object.create(null)`. ioredis v6 also negotiates RESP3 but still hands `zscore` back as the string `'1.5'`. So the "same" helper returns different types per client. v6 also sets new defaults: `maintNotifications: 'auto'`, `keepAliveInitialDelay` 30 s, and a `commandOptions.timeout` default of 5000 ms. In local testing that timeout did **not** cut off a 6.5 s Lua script or a 7 s `BLPOP` after they were written, so don't build a trap on it. **[verified locally]** nr `zScore` → `1.5 number`; io `zscore` → `'1.5' string`; both report protocol 3.
- **Correct:** Normalise at your boundary (`Number(x)`), and pin `RESP: 2` (node-redis) / `protocol: 2` (ioredis) only if you must keep v5 shapes.
- **Source:** https://github.com/redis/node-redis/blob/master/docs/v5-to-v6.md ; https://github.com/redis/ioredis/releases/tag/v6.0.0 ("uses RESP3 by default… set `protocol: 2`")
- **Testable how:** Real Redis. A leaderboard `getScore(user)` must return `number` with either client injected → assert `typeof === 'number'` and `strictEqual(score, 1.5)` for both adapters.
- **Likelihood an LLM gets it wrong:** **High.** Post-cutoff for most models. They will assume RESP2 strings (`parseFloat` everywhere is harmless, but a typed `string` return or `=== '1.5'` comparison fails).

### 15. Eviction: default is `noeviction`, and `volatile-*` with no TTLs = OOM errors

- **Mistake:** "Redis evicts LRU when full, so the cache is safe." The default `maxmemory-policy` is **`noeviction`**: writes fail with `OOM command not allowed`. With `volatile-lru`/`volatile-lfu`/`volatile-ttl`, keys **without** a TTL are never evicted, so a cache that forgets TTLs (trap 1) fills up and starts failing writes. The app also needs to treat an OOM on a cache write as non-fatal (serve from DB). Redis 8.6 added `allkeys-lrm` / `volatile-lrm` (least recently *modified*), which is a different signal from LRU on read-heavy caches. **[verified locally]** default `noeviction`; with `--maxmemory 3mb --maxmemory-policy volatile-lru`, the 216th 10 KB TTL-less SET → `OOM command not allowed…`.
- **Correct:** Dedicated cache instances use `allkeys-lru` or `allkeys-lfu`. Mixed instances use `volatile-*` *and* put a TTL on every cache key. Cache writes are best-effort (catch, log, continue).
- **Source:** https://redis.io/docs/latest/develop/reference/eviction/ ; https://redis.io/docs/latest/develop/whats-new/8-6/ (lrm policies)
- **Testable how:** Real Redis started with `--maxmemory 2mb --maxmemory-policy volatile-lru`. Write 5 MB of entries through the candidate's cache → assert every `get()` still returns correct data (DB fallback) and no call throws.
- **Likelihood an LLM gets it wrong:** **Medium.** Many models state that the default is `allkeys-lru` or "LRU". Few make cache writes non-fatal.

### 16. Big keys and pattern invalidation: `KEYS` and blocking `DEL`

- **Mistake:** `KEYS user:*` then `DEL ...keys` to invalidate a prefix. `KEYS` is O(N) over the whole keyspace and blocks the server. `DEL` of one huge hash/set/zset frees memory on the main thread (`lazyfree-lazy-user-del` is still `no` by default in 8.10). A related mistake: one giant hash per tenant as "the cache", which makes the key both big and hot.
- **Correct:** `SCAN` with `MATCH`/`COUNT` (cursor loop, trap 13) plus `UNLINK` (async free). Or avoid pattern deletes entirely: keep a version number per namespace (`ns:user:ver`), embed it in keys (`user:v7:42`), and `INCR` it to invalidate. Find problems with `redis-cli --bigkeys` / `--memkeys` and (8.6+) `HOTKEYS`. **[verified locally]** `CONFIG GET lazyfree*` → all `no`.
- **Source:** https://redis.io/docs/latest/commands/keys/ (warning: do not use in production); https://redis.io/docs/latest/commands/unlink/ ; https://redis.io/docs/latest/commands/hotkeys/
- **Testable how:** Real Redis. Hidden test runs `CONFIG RESETSTAT`, calls `invalidateNamespace('user')`, then reads `INFO commandstats` and asserts `cmdstat_keys` is absent (and `cmdstat_unlink` or a version `INCR` is present), plus all old entries are unreachable via `get()`.
- **Likelihood an LLM gets it wrong:** **Medium.** It knows "don't use KEYS" but still reaches for `DEL` and, in node-redis, the broken cursor loop.

### 17. HTTP caching: `no-cache` vs `no-store`, weak ETags, and 304 details

- **Mistake:** (a) Using `Cache-Control: no-cache` to mean "never store" (that's `no-store`; `no-cache` means "store, but revalidate every time"). (b) Comparing `If-None-Match` with `===` against the ETag, which ignores lists (`"a", "b"`), `*`, and `W/` weak prefixes. `If-None-Match` uses **weak** comparison, so `W/"x"` matches `"x"`. (c) A 304 that sends a body, or omits the `ETag`/`Cache-Control`/`Vary` that the 200 would have had. (d) Missing `Vary: Accept-Encoding` (or whatever header changes the response) when the representation differs.
- **Correct:** Parse `If-None-Match` as a comma list, strip `W/`, match on any member or `*` → 304 with no body and the same validators/caching headers. Use `no-store` for secrets, `private` for per-user responses, and `no-cache` + ETag for "always fresh but cheap".
- **Source:** RFC 9111 §5.2.2.4 (no-cache) and §5.2.2.5 (no-store): https://www.rfc-editor.org/rfc/rfc9111 ; RFC 9110 §13.1.2 (If-None-Match, weak comparison), §15.4.5 (304 must include ETag, Cache-Control, Vary… that a 200 would have): https://www.rfc-editor.org/rfc/rfc9110
- **Testable how:** **No Redis needed.** `node:http` server from the candidate, hit with `fetch`. Cases: `If-None-Match: W/"<etag>"` → 304. `If-None-Match: "zzz", "<etag>"` → 304. `*` → 304. 304 has empty body and the same `ETag` + `Cache-Control`. Secret endpoint has `no-store`.
- **Likelihood an LLM gets it wrong:** **Medium.** (a) is well known now. (b) and (c) are wrong in most hand-rolled handlers.

## Versions checked

| Thing | Version (2026-10-12) | Source |
|---|---|---|
| Redis Open Source | **8.10.2** (GitHub latest, 2026-09-17); installed locally is 8.10.2 | https://github.com/redis/redis/releases ; `redis-server --version` |
| Redis 8.4 | DELEX, DIGEST, SET IFEQ/IFNE/IFDEQ/IFDNE, MSETEX, XREADGROUP CLAIM | https://redis.io/docs/latest/develop/whats-new/8-4/ |
| Redis 8.6 | XADD IDMP/IDMPAUTO, `allkeys-lrm`/`volatile-lrm`, HOTKEYS | https://redis.io/docs/latest/develop/whats-new/8-6/ |
| Redis 8.8 | INCREX (window-counter rate limiter), XNACK, Array type | https://redis.io/docs/latest/develop/whats-new/8-8/ |
| Redis 8.10 | LMOVEM/BLMOVEM, SUNIONCARD/SDIFFCARD, compact hashes | https://redis.io/docs/latest/develop/whats-new/ |
| node-redis (`redis`) | **6.3.0** on npm (2026-09-30). GitHub "Latest" badge still says 6.2.1. 6.4.0-beta.0 out today. v6.0.0: RESP3 default, Node ≥ 20 | `npm view redis`; https://github.com/redis/node-redis/releases ; https://github.com/redis/node-redis/blob/master/docs/v5-to-v6.md |
| ioredis | **6.0.0** (2026-07-31): RESP3 default (`protocol: 2` to opt out), Node ≥ 20. 6.1.0-beta.1 out today | `npm view ioredis`; https://github.com/redis/ioredis/releases |
| Node.js (local) | 24.21.0 | `node --version` |
| HTTP caching | RFC 9111 / RFC 9110 (June 2022, still current) | https://www.rfc-editor.org/rfc/rfc9111 |

Not verified: whether node-redis's 5 s default `commandOptions.timeout` ever
fires on an already-written command. The migration guide says the default is
5000 ms, but a 6.5 s Lua script and a 7 s BLPOP both completed. It looks like
the timeout covers only queue time before write. Don't build a trap on it
without reading `commands-queue.js` further.
