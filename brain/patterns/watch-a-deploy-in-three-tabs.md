---
name: watch-a-deploy-in-three-tabs
description: "Watching a prod deploy of a container service: baseline before merge, then CI job → orchestrator (revision, tasks, stopped reasons) → APM summary with 'compare with last week' → next-day memory + restarts. Exit 137 / OutOfMemoryError = OOM; 'scaling activity initiated by deployment' + exit 0 = normal trim."
metadata:
  type: feedback
---

**In short:** a deploy check answers four questions in time order, each in one
place. Did it ship (CI job), is it running (orchestrator), is it behaving (APM
compared with last week), is it stable (memory and restarts a day later).

**Why:** 2026-11-02, a dependency bump on a work service with an earlier OOM
scare. Giga asked "what to look at, what window to open?" three times while
clicking around a cloud console and an APM tool. A fixed order made it routine.
The same session turned up three traps:
- Screenshots taken right after the merge still showed the *old* build, because
  the deploy job hadn't run yet. Check the CI job before reading any chart.
- A task of the new revision showed "Stopped". It looked like a crash. It was the
  rollout trimming an extra task: the reason said scaling by the deployment, with exit code 0.
- An error message that looked new after the deploy turned out to predate it.
  A 3-day count showed it peaking 19 h before go-live (see [[line-up-incident-times-with-deploy-history]]).

**How to apply:**
1. **Before merge:** capture the baseline, which is the memory-utilization peak over 1–2 weeks.
   APM's "compare with = last week" covers latency, throughput and errors, so
   those need no screenshots.
2. **T+0–10 min, CI:** the per-job `deploy-production` result and its time, not the
   run-level conclusion.
3. **T+10 min, orchestrator:** new revision = target, old = 0 and inactive, N/N
   running. For any stopped task, read the reason and exit code. 137 or
   `OutOfMemoryError` means OOM. A deployment-initiated stop with exit 0 is normal.
   Stopped tasks disappear after about an hour, so read them now.
4. **T+15–60 min, APM:** the summary with compare-with-last-week, and the deploy marker
   showing the right sha. Check that logs continue with no gap after the marker. For any error that looks new,
   run `count(*) … LIKE '%msg%' SINCE 3 days ago TIMESERIES` before blaming the deploy.
5. **T+24 h:** memory peak no higher than baseline, no steady climb, and no task starts
   in the service events after the deploy.

The log search box can turn free text into a broken field filter and return
0 rows. Use the query console with NRQL `LIKE` instead.

**Signal:** "merged, what to look at?", "is it deployed?", "evidence for no OOM".
**Next time:** hand over steps 1–5 as a checklist with the click path. Take the
baseline before the merge, and give one action per step.
