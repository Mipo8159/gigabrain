---
name: answer-shape-short-first-map-for-how
description: "Lead with the short actionable answer; answer 'how does X work / are we using X' with one map table plus an honest gap list"
metadata:
  type: feedback
---

**In short:** give the short answer first, and answer "how does X work"
questions with one table plus an honest list of gaps.

1. **"What do I do" questions: short first.** At most 5 steps or 10 lines, then
   offer the long version in one line instead of writing it. For setup help, numbered
   blocks Giga can paste one at a time, each ending in a "reply done" checkpoint.
2. **"How does X work", "are we using X": a map.** One table (the thing, what it
   does, its status), then an honest gap list: unused, unproven, should have been
   used. Honest status words: "tested by piping JSON, not yet fired live" beats "the
   hook protects you".
3. **Unfamiliar infrastructure: one sustained analogy beats jargon** (2026-10-20, VPN
   and port forwarding as a building: street address, guard, tunnel, numbered
   windows; Giga reasoned with it straight away), closed with a who-reaches-what table.
4. **A message for a third party carries only what they alone can answer** (a draft
   to a client's IT went from 8 questions to 3).
5. **A "done" report is short-first too:** first line = what changed in everyday
   words, then one line of proof, then where it stands; jargon and tables after
   (2026-10-22: "I don't understand what is going on here, simplify").
6. **Long background runs:** every update opens with the running verdict and its
   count ("19/26 done: 0 regressions"); harness repairs collapse into one line ("3
   fixes to my scripts, no repo touched") unless they change confidence (2026-10-28:
   repair news read as scope creep, "I never asked to fix anything").
7. **Guided UI hand-offs by screenshot:** one action per step, one path; alternatives
   only in a fallback line ("if empty, send me what it shows") (2026-11-02: two
   offered paths → "what to run where? I got confused").

**Why:** Giga checks their mental model before acting. A wall of prose gets sent
back (2026-10-01, 10-19 "simple steps" asked twice). A map without gaps hides the
difference between "only instructed" and "actually enforced or proven".

**Signal:** a long first answer forming, a report about to open with a table or
internal names, Giga asking "where are we?".

Related: [[giga-wants-argued-recommendations]], [[visual-learner-diagram-first]].
