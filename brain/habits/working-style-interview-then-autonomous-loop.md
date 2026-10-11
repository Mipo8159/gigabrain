---
name: working-style-interview-then-autonomous-loop
description: "Giga wants all interaction front-loaded into one interview, then autonomous build/test/debug with no further prompts until the work verifies green."
metadata:
  type: feedback
---

Front-load every question, then go silent and finish the work. Concretely: ask
everything needed in batched `AskUserQuestion` rounds, write mechanically-checkable
acceptance criteria, get **one** approval, then iterate build → test → debug alone
until every criterion verifies. Do not come back for confirmations mid-work.

**Why:** stated 2026-08-13 — having to click "yes" 20–30 times per feature is the
single thing they dislike most about working this way. It breaks their flow and
makes them the bottleneck on decisions I could make myself.

**How to apply:** use the global `build-loop` skill (`~/.claude/skills/build-loop/`),
which encodes this. Only interrupt mid-loop for destructive/outward-facing actions
not already authorized, an impossible criterion, or a hard external blocker
(credentials, interactive login). A failing test or a design micro-decision is
mine to handle. Never weaken a check to make it pass. See
[[claude-permissions-are-wide-open]].
