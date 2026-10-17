# Fact-check: code-practices exams

Date: 2026-10-15. Files: evals/knowledge/code-practices/exams/v1.json … v5.json.
Most questions are design judgement calls; flagged only where a key or a "why" is defensibly wrong.
Postgres behaviour was checked against the local postgres:17 container (gb-knowledge-pg).

## v1.json

| id | verdict | source | note |
|---|---|---|---|
| code-practices-v1-q01 | ok | known | floor + distribute remainder |
| code-practices-v1-q02 | fixed | local postgres:17 test (`PREPARE … LIMIT $1; EXECUTE ('2.5')`) | text param `'2.5'` errors for bigint LIMIT, not coerced; why now cites `+20` / ` 20 ` which PG does accept |
| code-practices-v1-q03 | ok | known | IANA zone per store; fixed offsets ignore DST |
| code-practices-v1-q04 | ok | known | mass assignment |
| code-practices-v1-q05 | ok | https://www.ietf.org/archive/id/draft-ietf-httpapi-idempotency-key-header-07.html | draft says 409 for in-flight duplicate (draft now expired, still the reference) |
| code-practices-v1-q06 | ok | known | |
| code-practices-v1-q07 | ok | known | |
| code-practices-v1-q08 | ok | known | additive evolution |
| code-practices-v1-q09 | ok | known | fetch follows redirects by default |
| code-practices-v1-q10 | ok | known | identifiers can't be bound |
| code-practices-v1-q11 | ok | known | raw-body HMAC |
| code-practices-v1-q12 | ok | known | |
| code-practices-v1-q13 | ok | known | AsyncLocalStorage |
| code-practices-v1-q14 | ok | https://sre.google/workbook/alerting-on-slos/ | 14.4x / 1h / 5m confirmed |
| code-practices-v1-q15 | ok | known | cardinality |
| code-practices-v1-q16 | ok | known | |
| code-practices-v1-q17 | ok | https://nodejs.org/api/test.html#class-mocktimers | mock.timers supports Date + setTimeout, tick() |
| code-practices-v1-q18 | ok | known | CDC |
| code-practices-v1-q19 | ok | known | PG rename is catalog-only |
| code-practices-v1-q20 | ok | known | flags as kill switch |

## v2.json

| id | verdict | source | note |
|---|---|---|---|
| code-practices-v2-q01 | ok | known + local node v24 | `Math.round(parseFloat('1.005')*100)` = 100, `(1.005).toFixed(2)` = '1.00' verified |
| code-practices-v2-q02 | ok | known | IANA zone wall-clock |
| code-practices-v2-q03 | ok | known + local node v24 | Jan 31 + setUTCMonth → Mar 3 verified |
| code-practices-v2-q04 | ok | known | `now()` = txn start; keyset tie-breaker |
| code-practices-v2-q05 | ok | known | unique event id in same txn |
| code-practices-v2-q06 | ok | https://www.ietf.org/archive/id/draft-ietf-httpapi-idempotency-key-header-07.html | 422 for payload mismatch confirmed |
| code-practices-v2-q07 | ok | known | RFC 9457 |
| code-practices-v2-q08 | ok | known | |
| code-practices-v2-q09 | ok | local node v24 | join → `/srv/uploads-private/x`; normalize leaves `..` |
| code-practices-v2-q10 | ok | known | rotate + runtime secrets/least privilege |
| code-practices-v2-q11 | ok | known | LIKE ESCAPE, `= ANY($1)` |
| code-practices-v2-q12 | ok | local node v24 | timingSafeEqual throws RangeError ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH |
| code-practices-v2-q13 | ok | known | log injection via logfmt |
| code-practices-v2-q14 | ok | known | traceparent in Kafka headers |
| code-practices-v2-q15 | ok | known | |
| code-practices-v2-q16 | ok | known | |
| code-practices-v2-q17 | ok | known | property tests |
| code-practices-v2-q18 | ok | known | |
| code-practices-v2-q19 | ok | known | canary + auto rollback |
| code-practices-v2-q20 | ok | https://www.postgresql.org/docs/17/sql-altertable.html | SET NOT NULL skips scan with valid CHECK; VALIDATE takes SHARE UPDATE EXCLUSIVE |

## v3.json

| id | verdict | source | note |
|---|---|---|---|
| code-practices-v3-q01 | ok | https://www.postgresql.org/docs/current/datatype-money.html | money precision set by lc_monetary, no currency stored |
| code-practices-v3-q02 | ok | local node v24 | `new Date('2026-03-15').getDate()` = 14 under TZ=America/New_York |
| code-practices-v3-q03 | ok | local node v24 | JSON.parse keeps `__proto__` as own key and stringify keeps it |
| code-practices-v3-q04 | ok | known | keyset + fixed upper bound |
| code-practices-v3-q05 | ok | known | webhooks unordered |
| code-practices-v3-q06 | ok | known | per-item results |
| code-practices-v3-q07 | ok | known | |
| code-practices-v3-q08 | ok | known | opaque cursor |
| code-practices-v3-q09 | ok | known | DNS rebinding TOCTOU |
| code-practices-v3-q10 | ok | known | IDOR |
| code-practices-v3-q11 | ok | known | revoke, investigate, remediate |
| code-practices-v3-q12 | ok | known | timestamp tolerance + dedupe |
| code-practices-v3-q13 | ok | known | |
| code-practices-v3-q14 | ok | known | error-budget policy |
| code-practices-v3-q15 | ok | known | |
| code-practices-v3-q16 | ok | known | |
| code-practices-v3-q17 | ok | known | |
| code-practices-v3-q18 | ok | known | mutation testing |
| code-practices-v3-q19 | ok | known | |
| code-practices-v3-q20 | ok | known | liveness local only (ref URL returns 200) |

## v4.json

| id | verdict | source | note |
|---|---|---|---|
| code-practices-v4-q01 | ok | known | largest remainder |
| code-practices-v4-q02 | ok | known | timestamptz for instants |
| code-practices-v4-q03 | ok | local node v24 | `1e309` parses to Infinity |
| code-practices-v4-q04 | fixed | local node v24 (TZ=America/New_York) | UTC-date option expires 19:00 NY on 31 Dec, not the same cutoff as the bug (19:00 on 30 Dec); why reworded |
| code-practices-v4-q05 | ok | known | allkeys-lru evicts regardless of TTL |
| code-practices-v4-q06 | ok | known | open enums |
| code-practices-v4-q07 | ok | known | unhandled rejection throws by default since Node 15 |
| code-practices-v4-q08 | ok | known | RFC 9457 `type` |
| code-practices-v4-q09 | ok | known | IMDSv2 PUT + header; egress restriction |
| code-practices-v4-q10 | ok | known | server-side authz |
| code-practices-v4-q11 | ok | known | |
| code-practices-v4-q12 | ok | https://www.postgresql.org/docs/current/ddl-priv.html | owner's drop/alter right cannot be revoked |
| code-practices-v4-q13 | ok | known | tail sampling |
| code-practices-v4-q14 | ok | known | structured logs |
| code-practices-v4-q15 | ok | known | lag / oldest-message age |
| code-practices-v4-q16 | ok | known | registry compatibility mode |
| code-practices-v4-q17 | ok | known | concurrent race test |
| code-practices-v4-q18 | ok | known | `==` vs `===` number/string |
| code-practices-v4-q19 | ok | https://www.postgresql.org/docs/current/sql-createindex.html | CIC not in txn; invalid index on failure; plain build blocks writes |
| code-practices-v4-q20 | ok | known | sticky hashing |

## v5.json

| id | verdict | source | note |
|---|---|---|---|
| code-practices-v5-q01 | ok | known | Sydney UTC+10/+11 |
| code-practices-v5-q02 | ok | known | atomic refund invariant |
| code-practices-v5-q03 | ok | known | |
| code-practices-v5-q04 | ok | known | reject unknown write fields |
| code-practices-v5-q05 | ok | known | outbox + backoff |
| code-practices-v5-q06 | ok | known | PUT idempotent (RFC 9110) |
| code-practices-v5-q07 | ok | known | Error `cause` (ES2022) |
| code-practices-v5-q08 | ok | https://www.rfc-editor.org/rfc/rfc9745.html | Deprecation header is RFC 9745 (Mar 2025), pairs with Sunset |
| code-practices-v5-q09 | ok | known | execFile, no shell |
| code-practices-v5-q10 | ok | known | RFC 8725 pinned alg |
| code-practices-v5-q11 | ok | known | |
| code-practices-v5-q12 | ok | known | |
| code-practices-v5-q13 | ok | known | dead man's switch |
| code-practices-v5-q14 | ok | known | summaries not aggregatable |
| code-practices-v5-q15 | ok | known | |
| code-practices-v5-q16 | ok | https://nodejs.org/api/test.html#class-mocktimers | |
| code-practices-v5-q17 | ok | known | |
| code-practices-v5-q18 | ok | known | mocks the unit under test |
| code-practices-v5-q19 | ok | known | progressive config rollout |
| code-practices-v5-q20 | ok | known | flag hygiene |

## Result

100 checked, 98 ok, 2 fixed (v1-q02, v4-q04), 0 unsure. Both fixes were distractor `why` texts with a false reason; no answer key changed.
