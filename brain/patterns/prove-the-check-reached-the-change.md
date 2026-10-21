---
name: prove-the-check-reached-the-change
description: "When 'it doesn't work on staging' follows a deploy, first prove the manual check could reach the changed code: right environment, the event that actually triggers it, and no silent filter or early return in between. Don't infer the environment from a hostname."
metadata:
  type: feedback
---

**In short:** before suspecting your change, prove the check went through it.
Most "deployed it, nothing happens" reports in event-driven services are a
check that never reached the new code.

**Why:** 2026-10-21/22, a work repo. A chat-SDK upgrade was on staging, and a
test run "didn't show up in chat". The code was fine. Three things stood
between the check and the change:
1. Claude guessed the app hostname was production from its TLD. It was staging;
   the user corrected it. That cost one round.
2. The consumer only posts when a run *finishes*. Creating a run sends nothing.
3. A filter in the consumer drops every generic "run finished" rule in an
   integration when any "automated/manual run finished" rule exists in it. So
   all the generic rules on the settings page were active but silently ignored.
   No log line, because the code returned before calling the vendor.
After one rule was switched to "Manual" and the run was finished, the message
arrived, and the upgrade was proven on the first real try.

**How to apply:**
- Read the consumer or handler top to bottom and list every `return` before
  the outbound call. Each one is a silent drop to rule out against the live
  config (screenshots of the settings page are enough).
- Name the triggering event exactly ("status → finished", not "a run").
- Ask which host is which environment, or check a note. Never infer it from a TLD.
- Only then reach for logs or code changes.

**Signal:** "I deployed it on staging but it isn't working" with no error text,
in a service that consumes events and fans out notifications.
**Next time:** answer with the early-return list and the exact trigger first,
then ask for the one fact that tells them apart (did it finish? which rule?).

Related: [[read-the-gate-before-guessing]], [[prove-integration-without-real-target]].
