---
name: ambient-transaction-outlives-commit
description: A unit-of-work that stores the transaction in request-scoped context (CLS/AsyncLocalStorage) and never clears it makes every later DB call in the same request run on a finished transaction. Types and builds pass; the second write 500s after the first was saved.
metadata:
  type: project
---

**Rule:** before chaining two service calls that each touch the DB inside one
request, read the unit-of-work helper. If it puts the transaction into
request-scoped context and doesn't remove it on commit/rollback, wrap the
whole controller body in one outer transaction so the inner calls reuse it.

**Why:** 2026-10-30, work repo. A controller created a record (its service
committed its own transaction) and then linked it to a parent. The repository
layer read the stale transaction from context, so the link would have thrown
"commit has been called on this transaction" on every request, after the
first row was already saved. tsc, eslint and the build were green. Only the
background `reviewer`, reading the helper, caught it.

**How to apply:** grep the helper for `set('transaction'` (or similar) and a
matching clear/`finally`. No clear → one outer transaction per request, or fix
the helper (wider change: propose separately).

**Signal:** "after X is created, also do Y" in a controller; a shared
`withTransaction` that each service calls itself.
**Next time:** open the unit-of-work file before writing the second call.
