---
name: green-e2e-on-async-action-proves-the-ack
description: "A UI end-to-end test of an action that finishes in a background worker (archive, export, delete, sync) usually asserts the toast or the 'queued' state, so it stays green while the worker is broken. Read the assertion before counting the test as coverage."
metadata:
  type: feedback
---

**In short:** for an async action, a green browser test proves the button
queued the job, not that the job ran. Count it as coverage only after reading
what it asserts.

**Why (2026-11-03, a work repo):** mapping a removal change to the shared e2e
suite, the "archive a workspace" case had passed on every run. Its last step
checks the success toast. The real archive runs in a 1-minute worker that only
takes the head of the queue, and 51 workspaces (most made by that same suite)
were stuck half-archived on staging. The test stayed green the whole time, and
each run added one more stuck row.

**How to apply:**
1. When a change touches an async path, open the matching e2e case and find its
   last `expect`. A toast, a "pending" badge or a list row = acknowledgement only.
2. Mark such cases "UI only" in the coverage map, and add the real outcome check
   (DB flag, status endpoint, a reload after the worker interval) as a manual
   step or a follow-up.
3. If the suite creates the data it later acts on, check whether its leftovers
   pile up in the queue it never verifies.

**Signal:** "which e2e tests cover my change?" for archive, delete, export,
import, resign, sync or any action that answers with "queued".
**Next time:** the coverage table gets a verdict column with "UI only" as a
distinct value, next to "covered" and "gap".

Related: [[prove-the-check-reached-the-change]], [[local-e2e-enter-at-the-boundary-you-changed]].
