---
name: a-test-must-be-able-to-fail
description: "A regression test proves nothing until it is shown red on the old code, failing on the behaviour's own assertion (not a missing symbol), with every gate that could swallow the failure (shadow/log-only modes) switched on."
metadata:
  type: feedback
---

**Rule:** before claiming a test guards a change, run it against the old code
and read *why* it fails. The failure must be the behaviour's assertion. A
missing class, an import error or a log-only validator does not count.

**Why:** in one work session (2026-11-02) three green tests could not catch
their bug:
- A removal test "failed on the old branch" only because the removed class no
  longer existed. Restore the old behaviour and it passed. A reviewer caught it.
  Fix: inject a mock collaborator (a logger) and assert the old side effect
  never happens. Red on old code with the behaviour's own message, green on the branch.
- A request schema ran in shadow mode (it logs, doesn't reject), so tests that
  claimed "the schema accepts this field" passed even with a schema that
  rejected it. Fix: switch enforcement on in that test file, plus one guard
  test that an invalid body *is* rejected.
- A "never drop the record" hardening fix passed its own tests, then an
  adversarial value (a proxy whose every trap throws) still wiped all fields.
  The check ran outside the per-key try.

**How to apply:** for each new test, (1) revert or stash the fix and run it,
(2) quote the failure message, (3) list the gates between input and assertion
(feature flags, shadow modes, mocks that swallow) and force them on, (4) for
robustness code, add the most hostile input you can build.

**Signal:** a reviewer asks "how is this tested?", a test is called
"red-first", or a validator or flag has a log-only mode.

**Next time:** put the red run's failure line in the PR body next to the green
count.
