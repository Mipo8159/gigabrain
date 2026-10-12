---
name: give-the-reviewer-the-requirement
description: Most of the gain in catching business-rule gaps comes from putting the requirement in the reviewer's context, not from a specialised agent; a new agent has to beat reviewer+spec on the same eval before it earns a place.
metadata:
  type: project
---

On 7 fixture cases (`bin/eval-intent`, 2026-10-12): `reviewer` **without** the
spec caught 4/7 planted business gaps; `reviewer` **with** the spec 7/7; the
purpose-built `intent-reviewer` 6/7, and its one miss was a false alarm on the
control case (it marks correct-but-untested code `at-risk`). So the requirement
in context did the work; the new agent's value is the *shape* of its report
(traceability table, coverage line, overclaims, ranked plan), not detection.

**Why:** an agent was built first and measured second; the three-arm eval
(no spec / spec / new agent) is what separated "the input helped" from "the
agent helped". One run per case, so these are noise-level numbers.

**How to apply:** whenever a ticket, spec or contract exists, pass it to
`reviewer` too. Choose `intent-reviewer` / `/intent-review audit` when the
deliverable is the report itself (an inherited repo, a take-home, an
interview). Any new review agent gets a three-arm eval with a negative
control before it is wired into a workflow.

**Signal:** "build an agent that checks X", or a review that has a spec available but isn't given it.
**Next time:** run the baseline with the extra input first; build the agent only if the eval shows a gap it closes.
