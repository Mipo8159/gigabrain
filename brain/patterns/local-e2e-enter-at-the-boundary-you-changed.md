---
name: local-e2e-enter-at-the-boundary-you-changed
description: "For a local end-to-end proof in a big multi-service env, pick the entry point first: start the flow at the nearest real boundary upstream of the change (e.g. put the producer's event on the topic), not at the UI, unless the UI is what changed. Give the UI path a stop rule. Prove before/after by changing exactly one variable, and use a query that counts the thing that changed."
metadata:
  type: feedback
---

**In short:** an E2E proof only has to run *the part you changed* for real. Start
the flow at the nearest real boundary upstream of it, and keep everything else equal.

**Why (2026-10-23):** proving that a consumer's outgoing HTTP call now shows up in
traces. The plan was "finish a run in the local web app". The UI path took about 8
rounds and never worked: a login redirect only accepted one hostname, local seed
accounts had expired passwords, one account landed in a broken sign-up wizard, then
the API refused the status change for every user, admin included (local
authorization data). None of it touched the code under test. Switching to putting
the same event the producer sends onto the topic worked first time: the consumer,
its upstream lookups and the outgoing call all ran for real.

**How to apply:**
1. Before starting, name the component under test and the boundary just upstream of
   it (topic, queue, HTTP endpoint). Enter there by default. Use the UI only when the
   UI or the producer is part of the change.
2. If the UI path is still wanted, give it a stop rule: two unrelated blockers means
   switching to the boundary. Say so to Giga in one line.
3. Build the event from the consumer's own type and its tests, with fresh timestamps
   (consumers often drop "outdated" messages).
4. Before/after with one variable: the same seed, the same event shape, and only the
   changed artifact swapped (for a library, copy its built `dist` over the installed
   one instead of reinstalling, if its new deps are already present).
5. Prove it with a query that counts the change: e.g. a TraceQL query for the new span
   returns 1 trace (after), while the business side (2 delivered messages) shows both
   runs worked. State the skipped hop plainly in the PR.

**Signal:** "end to end, like we did on staging" for a change that sits behind a
producer, a login or a permission system.
**Next time:** first message names the boundary and the stop rule for the UI path.

Related: [[first-test-run-on-a-restored-local-env]], [[prove-integration-without-real-target]],
[[prove-the-check-reached-the-change]].
