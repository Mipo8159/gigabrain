# Knowledge brief: postgres

Researched 2026-10-12. Target: PostgreSQL 17 (docker `postgres:17`), with notes where 18 differs.
Test harness: Node 24 + TypeScript + `pg` 8.23, `node --test`. "Real DB" means the hidden test needs the container.

## Mental model

1. Postgres never overwrites a row in place. An UPDATE writes a new row version (MVCC), and VACUUM later frees the old one. Long-open transactions stop that cleanup, so the table bloats.
2. The default isolation level is READ COMMITTED: each *statement* sees a fresh snapshot. "Read, then decide in app code, then write" is a race unless you lock the row or push the logic into one atomic UPDATE.
3. REPEATABLE READ and SERIALIZABLE do not make writers wait. They make one of them fail with SQLSTATE 40001, and your code has to retry the whole transaction.
4. Row locks (`FOR UPDATE`) last until COMMIT. With autocommit, "until commit" means "until the end of this one statement", so the lock does nothing.
5. A transaction belongs to one connection. With a pool, BEGIN, the queries and COMMIT must all go through the same checked-out client.
6. Anything set on a session (SET, advisory locks, prepared statements, temp tables) stays on the pooled connection and leaks to the next user. PgBouncer in transaction mode drops or breaks most of it.
7. NULL means "unknown", so `x = NULL` is never true, `NOT IN (… NULL …)` matches nothing, and a UNIQUE column allows many NULLs.
8. An index helps only if its column order matches the query: equality columns first, then the ORDER BY or range column. A matching index lets ORDER BY … LIMIT stop early instead of sorting the whole table.
9. Offset pagination gets slower the deeper you page, and it skips or repeats rows while data changes. Keyset pagination needs a unique, total sort key, such as (created_at, id).
10. Store instants as `timestamptz` (it stores UTC and converts on display), and do "per day" maths in the user's timezone, not the server's. Store money as `numeric` or integer cents, never float.
11. On a big table, the danger in schema changes is the lock, not the run time. An ALTER waiting for its lock blocks every query queued behind it, so use `lock_timeout`, CONCURRENTLY and NOT VALID.
12. The `pg` driver returns int8, numeric and count(*) as **strings**, and turns `timestamp`/`date` into JS Dates in the Node process's local timezone.

## Traps

### 1. `pg` returns bigint / numeric / count(*) as strings
- **Mistake:** `const { rows } = await pool.query('select count(*) from t'); if (rows[0].count === 0) …`, or `total += row.amount` on a numeric column. The comparison is always false, and `+` concatenates strings ("0" + "10.50" = "010.50").
- **Correct:** Convert on purpose. Cast in SQL (`count(*)::int` only when the value is known to fit), or call `Number()`/`BigInt()` at the boundary, or register `pg.types.setTypeParser(20, BigInt)` (int8, OID 20). Leave numeric (OID 1700) as a string or pass it to a decimal library. Remember that `sum(int)` returns bigint and `sum(numeric)`/`avg` return numeric, so they come back as strings too.
- **Source:** https://node-postgres.com/features/types (no parser registered means the value comes back as a string); https://github.com/brianc/node-postgres/issues/811
- **Testable how:** Real DB. `countActiveUsers()` and `orderTotal(id)` must return `number` (or a fixed-scale string). The hidden test uses `assert.strictEqual(await countActiveUsers(), 3)`, and an order with items 0.10 + 0.20 must total `"0.30"`/`30` cents, not `"00.100.20"` or `0.30000000000000004`.
- **Likelihood an LLM gets it wrong:** high. Models write `rows[0].count` as if it were a number. TypeScript doesn't catch it because `rows` is `any`.

### 2. A transaction run through `pool.query`
- **Mistake:** `await pool.query('BEGIN'); await pool.query('UPDATE …'); await pool.query('COMMIT')`. Each call may land on a different connection, so the "transaction" is not atomic and a ROLLBACK undoes nothing.
- **Correct:** `const c = await pool.connect(); try { await c.query('BEGIN'); …; await c.query('COMMIT') } catch (e) { await c.query('ROLLBACK'); throw e } finally { c.release() }`. node-postgres docs: "Do not use transactions with the pool.query method."
- **Source:** https://node-postgres.com/features/transactions
- **Testable how:** Real DB, pool `max: 5`. `transfer(a, b, amt)` must leave both balances unchanged when the second UPDATE fails (the hidden test makes it hit a CHECK constraint). Run 5 calls in parallel, so the BEGIN and the failing UPDATE land on different connections.
- **Likelihood an LLM gets it wrong:** medium. Models usually know this, but they slip in small helpers and "quick" code.

### 3. Lost update under READ COMMITTED (read, modify in app, write)
- **Mistake:** `SELECT balance …`, compute `balance - amt` in JS, then `UPDATE … SET balance = $computed`, even inside BEGIN/COMMIT. Two concurrent withdrawals both read 100 and both write 50.
- **Correct:** Use one atomic statement, `UPDATE accounts SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING balance` (check rowCount), or take the lock first with `SELECT … FOR UPDATE` inside the same transaction.
- **Source:** https://www.postgresql.org/docs/17/transaction-iso.html#XACT-READ-COMMITTED
- **Testable how:** Real DB with two connections. Fire 20 concurrent `withdraw(acct, 10)` calls on balance 100. The hidden test asserts exactly 10 succeed, the final balance is 0, and it never goes negative.
- **Likelihood an LLM gets it wrong:** medium. A plain "withdraw" prompt gets the atomic UPDATE, but a "validate business rules first" prompt pulls models into read-modify-write.

### 4. Raising the isolation level without a retry loop (40001 / 40P01)
- **Mistake:** Code switches to `BEGIN ISOLATION LEVEL SERIALIZABLE` (or REPEATABLE READ) "to be safe" and expects Postgres to block and serialize. In fact one transaction fails with SQLSTATE `40001` ("could not serialize access…"), and the error reaches the caller.
- **Correct:** Wrap the *whole* transaction in a retry with a bounded attempt count and jitter, keyed on `err.code === '40001'`, plus `'40P01'` for deadlocks. The docs say "Applications using this level must be prepared to retry transactions due to serialization failures."
- **Source:** https://www.postgresql.org/docs/17/transaction-iso.html#XACT-SERIALIZABLE
- **Testable how:** Real DB. The spec requires SERIALIZABLE for an "on-call doctors: at least one must stay on call" write-skew case. The hidden test runs `goOffCall(alice)` and `goOffCall(bob)` concurrently many times. Both must resolve (no thrown 40001) and exactly one doctor must remain on call.
- **Likelihood an LLM gets it wrong:** high. Models pick SERIALIZABLE correctly but rarely write the retry, and when they do they often retry only the failing statement instead of the whole transaction.

### 5. Job queue claiming without SKIP LOCKED, or with the lock outside a transaction
- **Mistake:** (a) `UPDATE jobs SET status='running' WHERE id IN (SELECT id FROM jobs WHERE status='pending' ORDER BY id LIMIT 5) RETURNING *`. The subquery takes no lock, so two workers claim the same rows (the READ COMMITTED recheck only re-evaluates the outer WHERE). (b) `SELECT … FOR UPDATE SKIP LOCKED` sent via `pool.query`, followed by a separate UPDATE. Under autocommit the lock is released at once.
- **Correct:** Claim in one statement: `UPDATE jobs SET status='running', locked_at=now() WHERE id IN (SELECT id FROM jobs WHERE status='pending' ORDER BY id LIMIT $1 FOR UPDATE SKIP LOCKED) RETURNING *`. Or SELECT … FOR UPDATE SKIP LOCKED and the UPDATE in one transaction on one client.
- **Source:** https://www.postgresql.org/docs/17/sql-select.html#SQL-FOR-UPDATE-SHARE
- **Testable how:** Real DB. Seed 200 jobs and run 8 concurrent `claimBatch(10)` workers in a loop until the queue is empty. The hidden test asserts no job id is claimed twice and all 200 are claimed.
- **Likelihood an LLM gets it wrong:** medium. Models know SKIP LOCKED but put it in the wrong layer, or leave out FOR UPDATE inside the subquery.

### 6. Deadlock from inconsistent lock order
- **Mistake:** `transfer(from, to)` updates `from` then `to`. Concurrent A→B and B→A transfers deadlock, and one fails with `40P01`.
- **Correct:** Lock rows in a fixed order, e.g. `SELECT id FROM accounts WHERE id = ANY($1) ORDER BY id FOR UPDATE`, then update. Also retry on 40P01 as a backstop.
- **Source:** https://www.postgresql.org/docs/17/explicit-locking.html#LOCKING-DEADLOCKS
- **Testable how:** Real DB. Run 50 concurrent transfers alternating A→B and B→A. The hidden test asserts every call resolves, money is conserved, and the `pg_stat_database.deadlocks` delta is 0 (zero deadlocks is a stronger check than "the retry hid them").
- **Likelihood an LLM gets it wrong:** medium. Most models write the naive order unless prompted about concurrency.

### 7. Upsert: `ON CONFLICT DO NOTHING RETURNING id` returns nothing on conflict, and duplicate keys in a batch
- **Mistake:** (a) `INSERT INTO tags(name) VALUES ($1) ON CONFLICT DO NOTHING RETURNING id` followed by `rows[0].id`. That is `undefined` when the tag already exists, because RETURNING only returns rows that were actually inserted or updated. (b) A multi-row upsert with the same key twice fails with "ON CONFLICT DO UPDATE command cannot affect row a second time" (a cardinality violation). (c) Using MERGE as an upsert under concurrency raises unique_violation (23505), because, per the docs, "MERGE does not attempt to avoid such errors".
- **Correct:** (a) Use `ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id` (it always returns a row, at the cost of a dead tuple), or insert-then-select in a CTE with `UNION ALL SELECT id FROM tags WHERE name=$1`. (b) Deduplicate the input first, in JS or with `SELECT DISTINCT ON`. (c) Prefer `INSERT … ON CONFLICT` for concurrent upserts.
- **Source:** https://www.postgresql.org/docs/17/sql-insert.html#SQL-ON-CONFLICT ; https://www.postgresql.org/docs/17/transaction-iso.html (MERGE paragraph)
- **Testable how:** Real DB. `getOrCreateTag(name)` called twice returns the same id. `upsertTags(['a','b','a'])` does not throw. 20 concurrent `getOrCreateTag('x')` calls all return the same id with no 23505 error.
- **Likelihood an LLM gets it wrong:** high. "DO NOTHING RETURNING id" is a very common LLM idiom, and models increasingly reach for MERGE (PG15+) as "the modern upsert".

### 8. ON CONFLICT with a partial unique index, and NULLs in unique keys
- **Mistake:** A soft-delete table has `CREATE UNIQUE INDEX … ON users(email) WHERE deleted_at IS NULL`, and the code writes `ON CONFLICT (email) DO UPDATE`. That fails with "there is no unique or exclusion constraint matching the ON CONFLICT specification". Separately, `UNIQUE (org_id, external_id)` with a NULL `external_id` lets duplicates in, so the upsert never conflicts.
- **Correct:** Repeat the predicate in the conflict target: `ON CONFLICT (email) WHERE deleted_at IS NULL DO UPDATE …`. For NULL keys, use `UNIQUE NULLS NOT DISTINCT (org_id, external_id)` (PG15+), or make the column NOT NULL.
- **Source:** https://www.postgresql.org/docs/17/sql-insert.html (index_predicate) ; https://www.postgresql.org/docs/17/sql-createtable.html (NULLS NOT DISTINCT)
- **Testable how:** Real DB. The schema is given, and the model writes `upsertUser`. The hidden test upserts the same email twice and expects one live row. It soft-deletes, re-creates, and expects two rows (one deleted). It upserts `(org 1, null)` twice and expects one row.
- **Likelihood an LLM gets it wrong:** high. Both failures are invisible to models writing from a happy-path mental model.

### 9. NULL comparisons: `NOT IN` with NULLs and `= $1` with a null param
- **Mistake:** `SELECT * FROM users WHERE id NOT IN (SELECT manager_id FROM teams)` returns **zero rows** as soon as any `manager_id` is NULL. `WHERE parent_id = $1` with `$1 = null` never matches root rows.
- **Correct:** Use `NOT EXISTS (SELECT 1 FROM teams t WHERE t.manager_id = u.id)`, and `WHERE parent_id IS NOT DISTINCT FROM $1`.
- **Source:** https://www.postgresql.org/docs/17/functions-subquery.html#FUNCTIONS-SUBQUERY-NOTIN ; https://www.postgresql.org/docs/17/functions-comparison.html
- **Testable how:** Real DB. `usersWhoAreNotManagers()` runs on seed data that includes a team with a NULL manager, and the hidden test expects the 3 non-managers. `childrenOf(null)` returns the top-level categories.
- **Likelihood an LLM gets it wrong:** medium. The NOT IN/NULL trap is well known, but it is still the shortest code to write.

### 10. Keyset pagination on a non-unique sort key, or with a mismatched index
- **Mistake:** `WHERE created_at < $1 ORDER BY created_at DESC LIMIT 20` with the cursor set to the last row's created_at. Rows sharing a timestamp are skipped or repeated at page edges. Also: `OFFSET $n` for deep pages, and an index on `(created_at)` alone when the query also filters `tenant_id`.
- **Correct:** Use a row-value comparison on a total order: `WHERE tenant_id = $1 AND (created_at, id) < ($2, $3) ORDER BY created_at DESC, id DESC LIMIT 20`, with an index on `(tenant_id, created_at DESC, id DESC)`. Row comparison only works when every column sorts in the same direction. Mixed directions need an expanded OR, or a negated key.
- **Source:** https://use-the-index-luke.com/sql/partial-results/fetch-next-page ; https://www.postgresql.org/docs/17/functions-comparisons.html#ROW-WISE-COMPARISON
- **Testable how:** Real DB. Seed 1,000 rows where groups of 50 share the same `created_at`, then page through with `listPage(cursor)`. The hidden test asserts every id appears exactly once, in order. A second test runs `EXPLAIN (FORMAT JSON)` on the page query after `ANALYZE` and asserts there is no `Sort` node and an `Index Scan` on the expected index.
- **Likelihood an LLM gets it wrong:** high. The single-column cursor is the default LLM answer, and tie-breaking is often missed.

### 11. Index shape: column order, ORDER BY + LIMIT, expression and partial indexes (and PG18 skip scan)
- **Mistake:** Index `(created_at, status)` for `WHERE status='open' ORDER BY created_at DESC LIMIT 10`. Index on `email` for `WHERE lower(email) = lower($1)`. Partial index `WHERE status='pending'` while the query passes the status as a parameter (`status = $1`): a generic plan cannot prove the predicate, so it ignores the index. Also assuming an index on `(a, b)` never helps `WHERE b = ?`. That is true on 17, but PG18 adds B-tree skip scan, which can use it when `a` has few distinct values.
- **Correct:** Equality columns first, then the sort column: `(status, created_at DESC)`. Use an expression index `ON users (lower(email))`, or a `citext` column. For partial indexes, write the predicate as a literal in the SQL text. `INCLUDE (…)` makes a covering index for index-only scans (which also need the visibility map, i.e. a vacuumed table).
- **Source:** https://www.postgresql.org/docs/17/indexes-multicolumn.html ; https://www.postgresql.org/docs/17/indexes-partial.html ; https://www.postgresql.org/docs/17/indexes-index-only-scans.html ; PG18 skip scan: https://www.postgresql.org/docs/18/release-18.html
- **Testable how:** Real DB. The model writes `migrations/*.sql` plus a query function. The hidden test seeds 50k rows, runs `ANALYZE`, then `EXPLAIN (FORMAT JSON)` each query with real params, and asserts no `Seq Scan` and no `Sort` above the scan for the ORDER BY+LIMIT query. Run partial-index checks under `SET plan_cache_mode = force_generic_plan` to expose the parameterised-predicate miss.
- **Likelihood an LLM gets it wrong:** medium. Models know "add an index" but often get column order and the parameterised partial-index detail wrong.

### 12. Timezones: `timestamp` vs `timestamptz`, server-TZ day buckets, and `now()` being frozen
- **Mistake:** `created_at timestamp` (without tz). node-postgres then parses it in the Node process's local TZ, so values shift when `TZ` differs between writer and reader. Also `GROUP BY date_trunc('day', created_at)` for "daily totals for a user in Asia/Tbilisi" buckets by the *session* TimeZone (often UTC). Also using `now()` in a long transaction to time steps: it returns the transaction start time each call. And a `date` column comes back as a JS Date at local midnight, so it is off by one day when serialised as UTC ISO.
- **Correct:** Use `timestamptz`. Bucket with the 3-arg `date_trunc('day', created_at, 'Asia/Tbilisi')` (PG12+) or `(created_at AT TIME ZONE $tz)::date`. Use `clock_timestamp()` for wall time within a transaction. For `date`, add `pg.types.setTypeParser(1082, s => s)` to keep the 'YYYY-MM-DD' string.
- **Source:** https://node-postgres.com/features/types ; https://www.postgresql.org/docs/17/functions-datetime.html#FUNCTIONS-DATETIME-TRUNC ; https://www.postgresql.org/docs/17/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT
- **Testable how:** Real DB with the container TZ set to UTC. The hidden test runs `node --test` with `TZ=America/New_York`. `dailyTotals(userTz='Asia/Tbilisi')` must put an order at 2026-03-01T21:30Z into **2026-03-02**. `getInvoice()` must return `dueDate === '2026-03-01'`. A round-trip insert/read of an instant must preserve epoch ms.
- **Likelihood an LLM gets it wrong:** high. Day-bucketing in the server timezone, and the `date` → local-midnight Date shift, slip past almost everyone.

### 13. Money: float types, JS arithmetic, and rounding rules
- **Mistake:** `price double precision` or `real`. Summing `parseFloat(row.amount)` in JS. Splitting a bill with `Math.round(x*100)/100`. Assuming SQL `round()` is banker's rounding (or that numeric and float round the same way). Using the `money` type, which depends on `lc_monetary`.
- **Correct:** Use `numeric(12,2)` or `bigint` cents. Do sums in SQL (`sum(amount)`) or in integer cents / BigInt / a decimal library. Know that `round(numeric)` breaks ties **away from zero** (`round(2.5::numeric) = 3`), while `round(double precision)` is platform-dependent, usually half-to-even (`round(2.5::float8) = 2`). Allocate remainders explicitly so that the shares sum to the total.
- **Source:** https://www.postgresql.org/docs/17/functions-math.html ; https://www.postgresql.org/docs/17/datatype-money.html
- **Testable how:** Real DB. `splitBill(10.00, 3)` must return shares that sum exactly to `10.00`. `invoiceTotal()` over 1,000 lines of 0.10 must equal `"100.00"`. The spec asks for VAT rounded "half up" on values like 2.675, and the hidden test catches float (`2.67`) versus numeric (`2.68`).
- **Likelihood an LLM gets it wrong:** medium. Models avoid float columns, but they still do JS float maths on the strings `pg` returns.

### 14. Session state leaking through a pool (SET, `SET LOCAL $1`, advisory locks) and PgBouncer transaction mode
- **Mistake:** A multi-tenant RLS helper runs `await client.query("SET app.tenant_id = '" + id + "'")` (session-level, and an injection risk), then releases the client. The next checkout runs as the previous tenant. Trying `SET LOCAL app.tenant_id = $1` fails, because utility statements can't take bind parameters. `pg_advisory_lock(k)` on one pooled client and `pg_advisory_unlock(k)` on another leaves the lock held forever. Under PgBouncer transaction pooling, SET/RESET, LISTEN, session advisory locks, SQL PREPARE and WITH HOLD cursors are "Never" supported.
- **Correct:** Inside the transaction, `SELECT set_config('app.tenant_id', $1, true)` (true = transaction-local). Use `pg_advisory_xact_lock($1)` inside a transaction. Protocol-level named prepared statements work through PgBouncer ≥1.21 when `max_prepared_statements` > 0 (default 200 in current docs).
- **Source:** https://www.pgbouncer.org/features.html ; https://www.pgbouncer.org/config.html#max_prepared_statements ; https://www.postgresql.org/docs/17/functions-admin.html#FUNCTIONS-ADMIN-SET ; https://www.postgresql.org/docs/17/explicit-locking.html#ADVISORY-LOCKS
- **Testable how:** Real DB, pool `max: 1`. Call `withTenant(1, q)`, then a raw `pool.query("select current_setting('app.tenant_id', true)")`, which must be empty or NULL. Run `withTenant(1)`/`withTenant(2)` concurrently with RLS on and assert there is no cross-tenant row. `withLock(key, fn)` on a `max: 3` pool must leave `pg_locks` with no advisory locks afterwards. (Optional: add an `edoburu/pgbouncer` container in transaction mode for a stricter variant.)
- **Likelihood an LLM gets it wrong:** high. `SET` per request is the common LLM RLS recipe, and "SET LOCAL with $1" is a frequent first attempt.

### 15. Migrations on big tables: lock queues, CONCURRENTLY, NOT VALID
- **Mistake:** `ALTER TABLE orders ADD COLUMN …` / `ADD CONSTRAINT … FOREIGN KEY` / `CREATE INDEX` with no `lock_timeout`. While a long read holds ACCESS SHARE, the ALTER waits for ACCESS EXCLUSIVE and every new query queues behind it, an outage. `CREATE INDEX CONCURRENTLY` inside a migration transaction fails ("cannot run inside a transaction block"), and a failed CIC leaves an INVALID index behind. `ALTER COLUMN … SET NOT NULL` scans the whole table under ACCESS EXCLUSIVE.
- **Correct:** `SET lock_timeout = '2s'` plus a retry. Create indexes `CONCURRENTLY` outside a transaction, and on failure `DROP INDEX CONCURRENTLY IF EXISTS` and redo. Add constraints as `NOT VALID`, then `VALIDATE CONSTRAINT` (it takes only SHARE UPDATE EXCLUSIVE). For NOT NULL on PG12–17, add `CHECK (col IS NOT NULL) NOT VALID`, validate it, then `SET NOT NULL`, which skips the scan. PG18 allows `NOT NULL … NOT VALID` directly. Adding a column with a non-volatile default is metadata-only since PG11, but `DEFAULT gen_random_uuid()`/`clock_timestamp()` rewrites the table.
- **Source:** https://www.postgresql.org/docs/17/sql-altertable.html ; https://www.postgresql.org/docs/17/sql-createindex.html#SQL-CREATEINDEX-CONCURRENTLY ; https://www.postgresql.org/docs/18/release-18.html ; https://gocardless.com/blog/zero-downtime-postgres-migrations-the-hard-parts/
- **Testable how:** Real DB. The model writes `migrate(pool)` to add an FK, an index and NOT NULL to a seeded 200k-row table. The hidden test holds an open `BEGIN; SELECT … FROM orders` on another connection and starts the migration, then asserts that (a) a third connection's `SELECT 1 FROM orders LIMIT 1` completes in under 1 s while the migration waits (the lock_timeout made it give up or retry), (b) after the blocker commits the migration finishes, and (c) `pg_index.indisvalid` is true and all constraints are `convalidated`.
- **Likelihood an LLM gets it wrong:** high. Models know CONCURRENTLY, but almost never set `lock_timeout`, and they often wrap everything in one transaction.

### 16. N+1 queries (ORM loops or hand-written), and passing arrays into `IN`
- **Mistake:** `for (const o of orders) o.items = (await pool.query('select * from items where order_id=$1',[o.id])).rows`, or TypeORM lazy relations / Prisma `findMany` followed by per-row `findUnique`. The hand-written "fix" `WHERE order_id IN ($1)` with a JS array fails or matches nothing.
- **Correct:** Fetch in one round trip: `WHERE order_id = ANY($1::int[])` with the array as one param, then group in JS, or use a JOIN / `json_agg`. In ORMs, use eager loading (Prisma `include`, TypeORM `relations`/`leftJoinAndSelect`).
- **Source:** https://node-postgres.com/features/queries ; https://www.prisma.io/docs/orm/prisma-client/queries/relation-queries ; https://www.postgresql.org/docs/17/functions-comparisons.html#FUNCTIONS-COMPARISONS-ANY-SOME
- **Testable how:** Real DB. `listOrdersWithItems(customerId)` takes an injected `pg.Pool` that the hidden test wraps to count `query` calls. With 100 orders it must issue ≤2 queries and return the correct nested shape, and an empty customer must return `[]`.
- **Likelihood an LLM gets it wrong:** low/med. Models avoid N+1 when asked about performance, but default to the loop for "simple" fetch-with-children code.

## Versions checked (2026-10-12)

| Thing | Version | Source |
|---|---|---|
| PostgreSQL 18 (current major) | 18.6 (minors 2026-08-13); 18.0 GA 2025-09-25, EOL 2030-11-14 | https://www.postgresql.org/support/versioning/ |
| PostgreSQL 17 (eval target) | 17.11, EOL 2029-11-08 | same |
| PostgreSQL 19 | **not GA**: Beta 4 released 2026-09-24 (some features pulled, incl. SQL/PGQ) | https://www.postgresql.org/ (news), https://www.devx.com/cybersecurity/postgresql-19-new-features-release-date/ |
| PostgreSQL 14 | 14.24, EOL 2026-11-12 (next month) | versioning page |
| `pg` (node-postgres) | 8.23.1 (pg-pool 3.14.0) | `npm view pg` |
| PgBouncer | 1.26.0 (2026-09-23) | https://github.com/pgbouncer/pgbouncer/releases |
| TypeORM | 1.1.2 (0.3.x now tagged `legacy`) | `npm view typeorm dist-tags` |
| Prisma | `latest` tag = 8.0.0-rc.22, `prev` = 7.10.0; confirm which one before writing Prisma-specific cases | `npm view prisma dist-tags` |

PG18 changes worth knowing when a test runs on 18 instead of 17: built-in `uuidv7()`; `RETURNING old.*, new.*`; generated columns default to VIRTUAL; B-tree skip scan; `NOT NULL … NOT VALID`; MD5 passwords deprecated; initdb enables data checksums by default; VACUUM/ANALYZE now process inheritance children. PG17 added `transaction_timeout`, `MERGE … RETURNING` and `JSON_TABLE`. **Pin `postgres:17` in eval fixtures**, because skip scan (trap 11) and NOT NULL NOT VALID (trap 15) change the expected answers on 18.
