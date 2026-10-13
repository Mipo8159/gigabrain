---
name: lab-stubs-stay-off-shared-paths
description: In a tutor lab, the learner's stub must sit only on the code path its own spec tests; prove the scaffold by swapping in a reference implementation from the scratchpad, then restore the stub.
metadata:
  type: feedback
---

**In short:** when Claude scaffolds a lab step and leaves the pattern's core
as a stub for Giga, only its grading tests may reach it. With the stub in
place, exactly Giga's tests are red and everything else is green.

**Why:** 2026-10-06 (Nest lab, step 0). Every issue response included a field
computed by the learner's stub, so all issue end-to-end tests went red,
including race and atomicity tests unrelated to the learner's task. The
reviewer flagged it. Moving that field to detail views only, built after
COMMIT, gave 6 red (the learner's) and 22 green. The same coupling meant a bug
in display-only code could roll back a committed write.

**How to apply:**
- Before handover, run the suite with the stub and list the red tests. A red
  test outside the learner's spec means the stub is on a shared path: move the
  call or make it optional.
- Prove the scaffold anyway: copy the stub to the scratchpad, write a
  reference implementation in its place, run the full suite (3 times if it has
  race tests), restore the stub, and `grep` for the stub marker. Never leave
  the solution in `src/`.

**Signal:** writing a `YOUR CODE` stub that other code imports.
**Next time:** check the red-test list against the learner's spec before saying "only your part is red".
