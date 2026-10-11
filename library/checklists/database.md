---
name: checklist-database
description: Reviewer checklist for database diffs — loaded by the reviewer agent when the diff touches SQL, migrations, ORM entities/schemas, repositories or query code (Postgres-first).
metadata:
  type: library
  source: ecc
  upstream: [agents/database-reviewer.md, skills/postgres-patterns/SKILL.md, skills/database-migrations/SKILL.md]
  upstream_sha: ef648e01
  absorbed: 2026-10-03
---
# Database review checklist

Applies when: `*.sql`, `migrations/`, ORM entities/schemas (TypeORM, Prisma,
Drizzle, Kysely, SQLAlchemy, Django models, golang-migrate files), repository or
query-building code. Postgres-first; the principles carry to other engines.
Patterns partly derive from Supabase's postgres best practices (MIT).

## Blockers

- **Unparameterised queries** (string-built SQL, raw ORM calls with
  interpolation) → injection.
- **Migration takes a long lock on a large table**: inline `CREATE INDEX` (not
  `CONCURRENTLY`), `ALTER COLUMN … SET NOT NULL` on a big table (full scan under
  ACCESS EXCLUSIVE; add a `CHECK (col IS NOT NULL) NOT VALID`, then `VALIDATE`),
  `ADD COLUMN` with a volatile default (any default before PG 11), type changes
  that rewrite the table → writes blocked during deploy. (`ADD COLUMN … NOT NULL`
  with no default doesn't lock; it fails outright on a non-empty table.)
- **Destructive change in the same release as the code that stops using it**
  (drop/rename column or table while the running version still reads it) →
  errors during rollout. Use expand → migrate → contract across deploys.
- **Editing a migration that has already run in any shared environment** →
  environments drift silently. Add a new migration.
- **Schema change and data backfill in one migration** → long transaction, hard
  rollback. Split them; backfill in batches.
- **Check-then-act without a lock** (read balance/stock/status, then write) →
  race; use `SELECT … FOR UPDATE` in a transaction, or an atomic conditional
  `UPDATE … WHERE`.
- **External API call inside an open transaction** → locks held for network
  time; pool exhaustion under load.
- **Multi-tenant table without tenant scoping / RLS** where the repo uses RLS →
  cross-tenant reads. RLS policies must wrap per-row functions in `(SELECT …)`
  (e.g. `(SELECT auth.uid())`) and index the policy columns.
- **`GRANT ALL` to the application role** / public schema left writable.

## Should-fix

- **Foreign key without an index** → slow joins and cascading deletes that scan.
- **WHERE/JOIN/ORDER BY columns of new queries not indexed**; composite index
  order wrong (equality columns first, then range).
- **N+1**: query per item inside a loop → join, `IN (…)`, or batch load.
- **Inserts in a loop** → multi-row `INSERT` or `COPY`.
- **`OFFSET` pagination on large/growing tables** → cursor/keyset (`WHERE id > $last`).
- **`SELECT *` in production code** → over-fetch, breaks on column changes.
- **Types**: `int` for ids (use `bigint`/identity), `timestamp` without time zone
  (use `timestamptz`), `float` for money (use `numeric`), `varchar(255)` by habit
  (use `text`), strings/ints as booleans.
- **Random UUID primary keys** → prefer identity or UUIDv7.
- **Missing constraints**: `NOT NULL`, `CHECK`, unique keys the code assumes;
  FKs without an explicit `ON DELETE`.
- **Lock ordering**: multiple rows locked in arbitrary order → deadlocks; lock in
  a consistent order (`ORDER BY id FOR UPDATE`).
- **Worker/queue tables polled without `FOR UPDATE SKIP LOCKED`** → workers
  contend or double-process.
- **Soft-delete tables**: hot queries should use a partial index
  (`WHERE deleted_at IS NULL`).
- **Migration has no down/rollback path and isn't marked irreversible**, or no
  note on how to roll back.
- **Large backfill as one statement** → batch it, with progress and resumability.
- **Upserts done as select-then-insert** → use `INSERT … ON CONFLICT`.
- **Complex new query with no `EXPLAIN ANALYZE` evidence** on realistic data →
  ask for it.

## Nits

- Quoted mixed-case identifiers; use `lowercase_snake_case`.
- Covering index (`INCLUDE (col)`) where an index-only scan would clearly help.

## Not this checklist's job

- Secrets in connection strings, IAM/network exposure of the DB → `security.md`.
- ORM call sites' async/error handling → `typescript.md`, `python.md`, `go.md`.
