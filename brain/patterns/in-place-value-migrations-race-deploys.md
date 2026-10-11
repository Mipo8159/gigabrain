---
name: in-place-value-migrations-race-deploys
description: "A migration that rescales stored values (×10, unit change) can't tell old rows from new ones; it races the deploy and is not idempotent. Prefer no migration when the data isn't on prod."
metadata:
  type: project
---

**Situation (2026-10-02):** an API field changed unit (client sends euros,
DB stores coins ×10). A data migration multiplied existing rows by 10 and
cascaded to derived rows. It passed up/down/up on a throwaway Postgres, and the
`reviewer` subagent still found it unsafe:

- **Deploy-order race.** New code before the migration → new rows already in
  the new unit get multiplied again. Migration before new code → old pods keep
  writing the old unit, never converted. When the deploy pipeline doesn't run
  migrations, the window is real.
- **Not idempotent.** Derived rows still "match" their source after both are
  scaled, so a second hand-run scales again. Only the migration meta table
  protects you.
- **down() via integer division** truncates small values to 0 and can violate a
  `> 0` check — the rollback fails exactly when you need it.
- **Range drift.** Old max × factor silently exceeds the new validated max.

**Rule:** before writing a value-rescaling migration, ask "is this data on prod,
and how old is it?" If it's days old and test-only, skip the migration and let
the old rows be wrong. If it must exist: bound it by a timestamp/marker, guard
the post-scale max, round (not truncate) in down(), and run it in the same step
as the cutover.

**Tests won't show this** — it's a rollout property. This is the case for a
background `reviewer` pass on any data/money diff.
