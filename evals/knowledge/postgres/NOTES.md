# Postgres: what the runs taught

## Baseline 2026-10-12 (vanilla Opus 5.5, 2 runs per case, results/20261012-234721)

Base passed 15 of 16 runs. Vanilla Claude already gets these right on a small,
focused ticket. They do **not** belong in a skill:

- `pg` returns `count(*)` / `sum()` as strings (customer-stats 2/2)
- SERIALIZABLE needs a retry loop on 40001 (on-call-handoff 2/2)
- `ON CONFLICT DO NOTHING RETURNING` returns nothing for existing rows; duplicate
  keys inside one batch (post-tags-get-or-create 2/2)
- `ON CONFLICT` on a partial unique index must repeat the index predicate
  (user-upsert-soft-delete 2/2)
- day buckets in the user's time zone; `date` columns shifted by JS Date
  (daily-revenue-timezone, heldout, 2/2)
- session-level `SET` leaks the tenant through the pool; use `set_config(..., true)`
  in a transaction (tenant-context-rls 2/2)
- `FOR UPDATE SKIP LOCKED` job claiming (job-queue-claim, heldout, 2/2)

## The one failure

activity-feed-pagination, run 1: the keyset cursor was right, but Claude added
`CREATE INDEX CONCURRENTLY` to a migration file. The repo's migration runner wraps
each file in a transaction, so setup crashed (25001). The gap was not Postgres
knowledge. It was **not reading how the repo runs migrations** before using a
statement that can't run inside a transaction.

## What this means

On a small ticket with a real database and room to test, Opus already writes
correct Postgres. A skill that restates these rules would cost context in every
session for no gain. Where failures might still live (to test next):
- the trap is incidental inside a bigger multi-file feature (attention elsewhere);
- repo conventions that clash with a "best practice" (the failure above);
- review mode: spotting the bug in someone else's diff, rather than writing fresh code.
