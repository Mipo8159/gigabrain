---
name: give-the-reviewer-the-requirement
description: Most of the gain in catching business-rule gaps comes from putting the requirement in the reviewer's context, not from a specialised agent; a new agent has to beat reviewer+spec on the same eval before it earns a place.
metadata:
  type: project
---

**In short:** give the reviewer the spec. That, not a special agent, is what
catches business gaps.

On 7 test cases (`bin/eval-intent`, 2026-10-12):
- `reviewer` **without** the spec caught 4 of 7 planted business gaps.
- `reviewer` **with** the spec caught 7 of 7.
- The purpose-built `intent-reviewer` caught 6 of 7. Its one miss was a false
  alarm on the control case (it marks correct but untested code `at-risk`).

The requirement did the work. The new agent adds the *shape* of its report
(traceability table, coverage line, overclaims, ranked plan), not detection.

**Why:** the agent was built first, measured second. Only the three-arm eval
separated "the input helped" from "the agent helped". One run per case: noise-level.

**How to apply:** whenever a ticket, spec or contract exists, pass it to
`reviewer` too. Use `intent-reviewer` or `/intent-review audit` when the report
itself is the deliverable (an inherited repo, a take-home, an interview). Any
new review agent gets a three-arm eval with a negative control before it joins
a workflow.

**Signal:** "build an agent that checks X", or a review that has a spec available but isn't given it.
**Next time:** run the baseline with the extra input first; build the agent only if the eval shows a gap it closes.
