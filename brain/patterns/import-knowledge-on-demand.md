---
name: import-knowledge-on-demand
description: Grow the library by pull (a real project shows a gap), not push (absorbing a repo on spec); imported knowledge earns trust when an agent loads it during real work.
metadata:
  type: project
---

Absorb or write a skill when a live project needs it and can test it. Don't
import breadth "for later".

**Why:** measured 2026-10-06, three days after the first absorb: 54 library
skills, **0** used in real work (one probe only); 25 of 54 were mapped to no
stack, and all of them cost ~4.5k tokens of descriptions in every session. The
only imported entries that gained ledger evidence were 4 reviewer checklists,
because the reviewer agent loads them during real diffs. Skills wait for
Claude to choose them; checklists get loaded on every review.

**How to apply:**
- A new absorb needs a named project and step that will use it (e.g. "Kafka
  skill for the lab's step 2"), plus a stack mapping in `kit/stacks.json`.
- Prefer routing imported knowledge through an agent (reviewer checklist,
  researcher brief) over adding another always-visible skill.
- Retire off-stack entries at the next scoping pass instead of keeping them in case.

**Signal:** "let's absorb more repos" with no project waiting for the content.
**Next time:** name the project and step first; if none exists, park the source in `library/candidates/`.
