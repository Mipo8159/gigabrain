---
name: session-setup-works-from-either-folder
description: "newEra, newEra/mogulkhan and newEra/auctionize are wired to share one memory folder and one skill set, so sessions behave identically started from any of them."
metadata: 
  node_type: memory
  type: project
  originSessionId: 76ef8677-7efe-4340-854b-0fbea459db02
  modified: 2026-08-13T10:50:01.604Z
---

Set up 2026-08-13 so Giga can work from `newEra/` or from `newEra/mogulkhan/`
and get the same behaviour:

- **Memory** — both `.claude/settings.local.json` files set
  `autoMemoryDirectory: ~/.claude/memory/newEra`, so both cwds read and write the
  same memory folder instead of the default per-directory one. This file lives
  there. (The setting is ignored in a checked-in `settings.json`, so it must stay
  in `settings.local.json`.)
- **Skills** — mogulkhan's `add-slice`, `add-migration` and `run-stack` are
  symlinked from `~/.claude/skills/` into `newEra/mogulkhan/.claude/skills/`. The
  repo is the source of truth; edit the `SKILL.md` there. Their descriptions were
  changed to name mogulkhan explicitly because they are now visible in unrelated
  repos too.

**Why:** they explicitly asked for identical behaviour in both directions,
anticipating a stretch of mogulkhan-only work.

Extended 2026-08-13 to a third folder: `auctionize/` got the same
`autoMemoryDirectory` and three symlinked skills of its own — see
[[auctionize-has-its-own-claude-setup]].

Extended 2026-09-29 to a fourth folder: `newEra/issue-flow/` got `.claude/settings.local.json` with the same `autoMemoryDirectory` (plus Bash/WebSearch/Artifact allows); it's gitignored there. See [[tracker-distributed-systems-lab]] (issue-flow was deleted 2026-10-06).

**How to apply:** if a memory or skill seems missing, check which of the three
folders the session started in and whether that folder's `settings.local.json`
still carries `autoMemoryDirectory`. Do not blank those files — they hold
unrelated permission entries. See
[[working-style-interview-then-autonomous-loop]].
