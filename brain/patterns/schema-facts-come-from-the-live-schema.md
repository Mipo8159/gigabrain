---
name: schema-facts-come-from-the-live-schema
description: "A claim about column nullability or soft-delete semantics must be checked against information_schema on a migrated DB, not inferred from one migration file; two code readers agreeing is not proof. MySQL/MariaDB: `IS NULL` in WHERE matches the zero date on NOT NULL date columns."
metadata:
  type: project
---

**In short:** before calling existing DB code "broken", run it, or read the real
schema of a freshly migrated database. Reading migrations gives you the columns as
first created. Later ALTERs, defaults and engine quirks decide what the code actually does.

**Why:** 2026-10-27, a work repo (TypeScript + knex + MariaDB). I read the migration
that added `deleted_at` (no `notNullable()`) and the ACL queries (`deleted_at is null`).
I concluded that the repo's shared rollback helper, which writes `'0000-00-00'`, left
rows looking deleted, and I "fixed" my migration's `down` to write NULL. A background
reviewer reading the same code agreed. The first test run on a real migrated DB
failed: `Column 'deleted_at' cannot be null`. `information_schema` showed the
column was NOT NULL in all three tables. In MySQL/MariaDB, `col IS NULL` **in a
WHERE clause** matches the zero date on a NOT NULL date column, so the helper was
right. (In a SELECT expression, `SUM(col IS NULL)` returns 0, which looks like a
second bug. It isn't.) The same real-DB run then found a genuine bug no reader had
caught: a shared soft-delete helper passed row objects (`[{id: 1}]`) to `whereIn`,
so one of its three tables was never updated.

**How to apply:**
- Schema claims (nullability, defaults, types): query `information_schema.COLUMNS`
  on a DB migrated from scratch. Never infer them from one migration file.
- "This helper is broken": prove it red with a tiny script or test on the real DB
  before changing anything. Until then it's a guess, even if a second reviewer agrees.
- Count with WHERE, the way the app queries, not with SELECT expressions.
- When a test only checks `> 0`, assert full restore instead (active = total).

**Signal:** "the existing pattern looks wrong", soft-delete or rollback code, zero
dates, `IS NULL` on dates, `whereIn` fed by a `select()` result.
**Next time:** run the migration up/down on a fresh local DB and print
`information_schema` before deviating from the repo's precedent.

Related: [[prove-the-check-reached-the-change]], [[measure-baselines-in-a-scratch-copy]].
