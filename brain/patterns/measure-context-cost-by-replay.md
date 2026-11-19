---
name: measure-context-cost-by-replay
description: Always-loaded context has two costs, startup files and per-prompt hook injections; the second is invisible to a static budget and is measured by replaying real prompt history through the hook in a sandbox
metadata:
  type: feedback
---

Context cost has two parts: what loads once at session start (CLAUDE.md
chain, memory index, skill and agent descriptions) and what a
UserPromptSubmit hook adds on every prompt. A static budget only sees the first.

**Why:** 2026-11-19, a trim of the brain on a work machine. The static budget
said ~6.7k tokens at startup. Replaying 30 days of real prompts (1.7k prompts,
127 sessions) through the coach hook in a sandbox showed ~1.5k more per
session, up to ~6k in long sessions: mostly the same long cue and footer
repeated. Showing each cue kind in full once per session, then a short
self-contained form, cut it 40% with identical signal flags on every prompt.
Startup trims of the same day saved only 8%.

**How to apply:**
- Measure both parts: `bin/budget.py <repo> --max N` for startup, and a replay of
  `~/.claude/history.jsonl` through a copy of the hook in a temp root (its own
  inbox/kit) for the per-prompt part. Report tokens/session, not per file.
- Repeats are the cheap win: full text once per session, then a short form
  that still stands alone after `/compact` (the full text may be gone by then).
- When changing a hook's text, prove its flags/outputs for other tools are
  unchanged on the whole history, not on a few examples.
- Per-machine trims go in a gitignored profile (`kit/machine.local.json`), so
  the shared core stays shared; a missing or malformed profile means defaults.

**Signal:** "is the brain too big / diluting / costing tokens", or a hook
that prints on many prompts.
**Next time:** run the replay first; it usually points at the hook before the files.
