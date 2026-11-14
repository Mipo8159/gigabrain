---
name: stale-serial-after-explicit-id-seed
description: Rows bulk-inserted with explicit ids (seed migrations, data fixes) leave the Postgres serial sequence behind MAX(id); the first app-side INSERT collides with a duplicate-key 500. Check last_value vs MAX(id) when a table gets its first create endpoint.
metadata:
  type: project
---

**Rule:** when a table that was only ever filled by migrations or seeders gets
its first "create" code path, compare its sequence to its data before shipping:
`SELECT last_value FROM <t>_id_seq` vs `SELECT MAX(id) FROM <t>`. If the
sequence is behind, ship a `setval(pg_get_serial_sequence('<t>','id'),
GREATEST(MAX(id),1))` in the same migration.

**Why:** `INSERT … (id, …) VALUES (5, …)` doesn't call `nextval`, so the serial
stays where it was. In a work repo (2026-11-13) a lookup table seeded with ids
1–18 plus a sentinel 999 had its sequence at 4. The first admin create died on
a duplicate-key error, and every failure burns one value, so the
first ~15 creates on every environment would have 500'd, then again at 999.
tsc, lint and the build were all green. Only a real INSERT in a throwaway proof
script against the local DB caught it.

**How to apply:** the check costs one query, so run it on any table whose rows
all predate the feature. `setval` is idempotent, so it is safe on every
environment. On a fresh local DB, seeders that run *after* migrations make the
sequence stale again; note that in the handover rather than fighting it.

**Signal:** "add create endpoint" for a table that has seed data but no writer
in the app; seed files with literal `id:` values.
**Next time:** compare sequence vs MAX(id) before writing the endpoint, and fold
the `setval` into the feature's migration.
