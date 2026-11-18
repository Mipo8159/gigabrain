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

**Exception: a same-day hard deadline.** Skip the question batch. Open with
"Done when …; assumed …" and build on those stated assumptions; Giga corrects
afterwards. 2026-10-12: with a deadline that day, Claude skipped questions and
delivered two verified repos smoothly, while an onboarding question in the same
window was rejected and the turn interrupted.

**The batch shows the output, not just questions about it.** For a new file, export or folder, put a
preview in the one batch: the folder tree, the header line and one real row. 2026-11-18/19: "transform to the
target's format … keep Excel copies for viewing" was built three times. First as per-day aggregate reports
(the target had no importer for events), then as raw rows in a separate subfolder, then as raw rows next to the
existing files. Each version passed its tests and a review. Giga's corrections were "untouched, as they were"
and "wrapped exactly as the rest". A 5-line preview would have surfaced both in the first batch. When the target
can't import the data, the default is the source's own rows, unchanged, in the existing layout.
