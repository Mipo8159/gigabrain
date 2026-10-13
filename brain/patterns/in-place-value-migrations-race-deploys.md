---
name: in-place-value-migrations-race-deploys
description: "A migration that rescales stored values (×10, unit change) can't tell old rows from new ones; it races the deploy and is not idempotent. Prefer no migration when the data isn't on prod."
metadata:
  type: project
---

**In short:** rescaling existing values races the deploy. Skip it for young
data; otherwise guard it.

**Situation (2026-10-02):** an API field changed unit (the client sends euros,
the DB stores coins, ×10). A data migration multiplied existing rows by 10 and
cascaded to derived rows. It passed up/down/up on a throwaway Postgres; the
`reviewer` still found it unsafe:

- **Deploy-order race.** New code before the migration: new rows already in the
  new unit get multiplied again. Migration before new code: old pods keep
  writing the old unit. If the pipeline doesn't run migrations, this is real.
- **Not safe to rerun.** Derived rows still "match" their source after both are
  scaled, so a second manual run scales again. Only the migrations table
  protects you.
- **down() with integer division** rounds small values to 0 and can break a
  `> 0` check. The rollback fails exactly when you need it.
- **Range drift.** The old maximum × factor silently exceeds the new validated maximum.

**Rule:** before writing a value-rescaling migration, ask "is this data on
prod, and how old is it?" If it's days old and test-only, skip the migration
and let the old rows be wrong. If it must exist: limit it by a timestamp or
marker, check the maximum after scaling, round (don't truncate) in down(), and
run it in the same step as the cutover.

**Tests won't show this** (it's a rollout property), hence a background
`reviewer` pass on any data or money diff.
