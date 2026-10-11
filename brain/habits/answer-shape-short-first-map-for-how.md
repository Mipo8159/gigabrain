---
name: answer-shape-short-first-map-for-how
description: "Lead with the short actionable answer; answer 'how does X work / are we using X' with one map table plus an honest gap list"
metadata:
  type: feedback
---

Two shapes Giga keeps asking for:

1. **Action questions → short first.** ≤5 numbered steps or ≤10 lines, then
   offer the long version in one line instead of writing it.
2. **"How does X work / are we using X / in what way" → a map.** One table
   (thing → what it does → used how / status), then an honest gap list
   (what is unused, unproven, or should have been used).

**Evidence:** 2026-10-01: "these are alot of instructions, please narrow it down
to few usefull steps"; "what are these folders, how do they work?".
2026-10-02: "are you aware of our gigaforge repo? how have you onboarded?" and
"are we using agents? in what way? or hooks and skills?" — both answered with an
inventory table + "not used, and why" + an untested-caveat, and Giga moved on
without a follow-up.

**Why:** Giga checks the mental model before acting; a wall of prose gets sent
back, and a map without gaps hides what is only instructed vs actually enforced
or proven.

**How to apply:** status words must be honest — "tested by piping JSON, not yet
fired in a live session" beats "the hook protects you". Pairs with
[[giga-wants-argued-recommendations]].
