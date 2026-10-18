---
name: own-tooling-fails-silently
description: "Giga's own small tools (hooks, checkers, stdlib CLIs, localhost servers, exporters) fail silently more than they crash: in 6 reviews between 2026-10-03 and 10-17 the real findings were unchecked exit codes, missing timeouts, fail-open paths, partial-run state and over-counting. Self-check those before handover, and review them even under 100 lines."
metadata:
  type: feedback
---

**In short:** when writing a small tool for Giga, assume its worst bug is
the one that prints nothing. Before handover, check this list yourself. Send
the tool to `reviewer` even when the diff is under the ~100-line threshold.

**Why:** these are library-ledger rows `silent-failures` (1.0), `python`
(0.8), `tests` (0.7) and `security` (0.9). They were promoted by /curate on
2026-10-17. Every real finding below came from the reviewer, and no test had
caught any of them:
- 2026-10-03: kit/guard hooks had fail-open paths and swallowed errors.
- 2026-10-05: a cron exporter advanced its cursor on a partial run (silent data loss).
- 2026-10-12: the exam checker didn't check `diff`'s exit code, so exit 2 passed.
- 2026-10-15: a localhost server lost a finished exam result on idle shutdown,
  and one malformed log row broke every page.
- 2026-10-17: usage-report over-counted tokens 2–3x, and bin/proof had no
  subprocess timeout or stdin and crashed on binary output.
- 2026-10-18: a generated `apply-blocked.py` ignored an unknown `--help` and
  applied every step for real, including `~/.claude/settings.json` (restored
  from backups). The same night a workflow agent reported a REPORT.md it had
  never written to disk. 2026-10-19: the finalize script's `git add -A` committed
  the apply script's `*.bak-*` backups (now gitignored).

**How to apply** (self-check before handover):
- Check every subprocess's exit code, give it a timeout and `stdin`, and
  decode its output with `errors="replace"`.
- On error, a hook or guard fails *closed* or says so loudly. It never passes quietly.
- State (cursor, ledger, result file) moves only after a complete run. Writes
  are atomic (temp file + rename) and appends are locked.
- One bad input row is skipped and counted. It doesn't break the whole run.
- Counts are deduped by their real key (see [[reading-claude-transcripts]]).
- A script that changes files refuses unknown flags (argparse) and treats
  `--help` as read-only; for Giga-run apply scripts, prefer dry-run by default.
- A script that writes backups inside a repo gitignores them first.
- Before reporting a file as written (yours or a subagent's), `ls` it.
- Tests cover the failure paths, proven by a mutation run (break the code and
  watch the test fail).

**Signal:** "write a hook / script / checker / small server" in gigabrain or a lab.

Related: [[test-guards-against-innocent-lookalikes]], [[incremental-export-cursor-only-advances-on-complete-runs]],
[[localhost-server-for-browser-pages]], [[shared-kit-and-checker-before-fan-out]].
