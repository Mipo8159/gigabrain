---
name: import-knowledge-on-demand
description: Grow the library by pull (a real project shows a gap), not push (absorbing a repo on spec); imported knowledge earns trust when an agent loads it during real work.
metadata:
  type: project
---

**In short:** import or write a skill only when a live project needs it and
can test it, not "for later".

**Why:** measured 2026-10-06, three days after the first absorb: 54 library
skills, **0** used in real work (one probe only). 25 of the 54 matched no
stack, and together their descriptions cost ~4.5k tokens in every session. The
only imported entries that earned ledger evidence were 4 reviewer checklists,
because the reviewer agent loads them on real diffs. Skills wait for Claude to
pick them; checklists load on every review.

**How to apply:**
- A new absorb needs a named project and step that will use it (for example
  "Kafka skill for the lab's step 2"), plus a stack entry in `kit/stacks.json`.
- Prefer routing imported knowledge through an agent (a reviewer checklist, a
  researcher brief) over adding another always-visible skill.
- Retire off-stack entries at the next scoping pass instead of keeping them "just in case".

**Measure before writing (2026-10-13).** 414 graded runs over 9 backend domains
(`bin/eval-knowledge`, hidden tests): vanilla Opus 5.5 passed 159/162 write-mode runs,
and Haiku 5.5 passed 66/66. Three imported "patterns" skills fired 1/24 with no lift. One real gap
in total (a circuit breaker counting caller 4xx), closed by a one-rule skill (1/3 → 3/3).
So before writing or importing a knowledge skill, run the base arm on 3–8 cases. Write
rules only for what fails, after auditing that the failure isn't an unfair test.

**Signal:** "let's absorb more repos" with no project waiting for the content.
**Next time:** name the project and step first; if none exists, park the source in `library/candidates/`.
For a knowledge skill: `bin/eval-knowledge --domain <d> --arms base` first.
