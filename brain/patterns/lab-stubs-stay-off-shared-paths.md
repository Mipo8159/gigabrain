---
name: lab-stubs-stay-off-shared-paths
description: In a tutor lab, the learner's stub must sit only on the code path its own spec tests; prove the scaffold by swapping in a reference implementation from the scratchpad, then restore the stub.
metadata:
  type: feedback
---

When Claude scaffolds a lab step and leaves the pattern core as a stub for Giga,
the stub must be reachable **only** from the tests that grade it. With the stub
in place, exactly Giga's tests are red and everything else is green.

**Why:** 2026-10-06 (Nest lab, step 0). Every issue response included a field
computed by the learner's stub, so all issue e2e tests went red, including the
race and atomicity tests that had nothing to do with the learner's task. The
reviewer flagged it. Moving that field to detail views only, built after COMMIT,
gave 6 red (the learner's) / 22 green. The same coupling also meant a bug in
display-only code could roll back a committed write.

**How to apply:**
- Before handing over, run the suite with the stub and list the red tests. Any
  red test outside the learner's spec means the stub is on a shared path: move
  the call or make it optional.
- Prove the scaffold anyway: copy the stub to the scratchpad, write a reference
  implementation in place, run the full suite (3× when it has race tests),
  restore the stub, `grep` for the stub marker. Never leave the solution in `src/`.

**Signal:** writing a `YOUR CODE` stub that other code imports.
**Next time:** check the red-test list against the learner's spec before saying "only your part is red".
