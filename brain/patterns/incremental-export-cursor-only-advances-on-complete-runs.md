---
name: incremental-export-cursor-only-advances-on-complete-runs
description: "Design rules for incremental (cursor/ledger) exporters: re-read a window for late rows, advance the cursor only after a complete run, commit the ledger only after the artifact exists, stop on duplicate keys, refuse full re-emits on a used ledger."
metadata:
  type: feedback
---

**Rule:** an incremental exporter (DB → files or API, run by cron) needs **all** of these. Each one was a
real bug or review finding the first time:
1. **Window, not a hard cursor**, for event rows: re-read *last complete run − N days*, measure the real late-arrival lag, and dedupe through a ledger of (entity, key, content-hash).
2. **The cursor advances only after a *complete* run.** A run limited by entity, tenant, or a later `--since` must not move it, or the skipped days are never read.
3. **Commit the ledger only after the artifact is fully written.** Write to a temp dir, rename, then commit. If the commit fails after the rename, mark the artifact `DO-NOT-IMPORT`.
4. **Record "changed after export" hashes even on no-output runs**, or the same warning repeats forever.
5. **A duplicate key within one run stops the run**, because a multiplied join becomes duplicate records downstream.
6. **Refuse a full re-emit when the ledger already has rows**, unless forced. It duplicates every append-only row in the target.
7. **Key personal data with a keyed hash (HMAC)**, not a plain hash: phone or ID spaces are small enough to brute-force.
9. **Consumers must take every artifact exactly once, in order.** Artifacts are deltas and the target is often
   append-only (a CRM import that can't update records duplicates them). So serve only artifacts whose ledger commit
   succeeded, ask the ledger rather than listing the directory, and have the client record the ids it fetched in its
   own state file, not infer them from which folders exist. Otherwise deleting an imported folder brings it back.
8. **Make output deterministic** (`STRING_AGG ... WITHIN GROUP (ORDER BY …)`), or hashes flap. Use language-neutral date literals (`'YYYYMMDD'` on SQL Server).

**Why:** 2026-10-05: a background reviewer found a cursor-advancing partial run (silent permanent data
loss), a reversible phone hash, a non-atomic ledger/artifact pair, and nondeterministic aggregates in a
fresh exporter. 15 offline tests had passed. The tests also caught the "warned forever" bug.

**How to apply:** use this as the checklist when designing any sync, export or ETL job. Write one offline
test per rule, using a fake extractor that emits the real CSV/row shape.
2026-10-14: rule 9 was designed in before the download client was built; a real pull then delivered a
53-row delta beside the 170 MB backfill, and the second click fetched nothing.
**Signal:** "let the client download the files", "only fetch new rows", "cursor", "each run should pull fresh data", "cron sync", "export to CSV/CRM".
**Next time:** paste rules 1–8 into the plan before writing code, not after review.
