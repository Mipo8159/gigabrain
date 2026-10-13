---
name: working-style-interview-then-autonomous-loop
description: "Giga wants all interaction front-loaded into one interview, then autonomous build/test/debug with no further prompts until the work verifies green."
metadata:
  type: feedback
---

**In short:** ask all questions at the start, get one approval, then finish
the work alone.

In practice: ask everything you need in batched `AskUserQuestion` rounds.
Write acceptance criteria a script or test can check. Get **one** approval.
Then build, test and debug alone until every criterion passes. Don't come back
for confirmations in the middle.

**Why:** Giga said on 2026-08-13 that clicking "yes" 20–30 times per feature
is the thing they dislike most about working this way. It breaks their flow
and makes them the bottleneck for decisions Claude could make.

**How to apply:** use the global `build-loop` skill
(`~/.claude/skills/build-loop/`), which works this way. Interrupt mid-loop only
for a destructive or outward-facing action that wasn't approved, a criterion
that turns out impossible, or a hard outside blocker (credentials, an
interactive login). A failing test or a small design decision is Claude's to
handle. Never weaken a check to make it pass. See
[[claude-permissions-are-wide-open]].
