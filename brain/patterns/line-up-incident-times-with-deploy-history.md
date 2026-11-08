---
name: line-up-incident-times-with-deploy-history
description: "When an incident is linked to a release, put the incident timestamps next to the deployment record (GitHub deployments + their statuses) before defending or fixing anything; a run's overall conclusion is not the deploy's outcome."
metadata:
  type: feedback
---

**In short:** "after we released X, prod fell over" is a claim about time. Check
it first: when did X actually go live in that environment, and what was running
at each incident timestamp?

**Why:** 2026-10-29, a work service. An ops engineer reported possible
out-of-memory restarts "after the release" of a dependency upgrade, and
suggested more CPU and memory. The deployment record showed both incidents
happened about a day *before* the upgrade reached prod. The build running then
came from another team's change, which had raised a pagination cap and is now the
lead suspect. Reading the upgrade's diff for memory leaks would have searched
the wrong code. Also: the workflow run for the release commit said `cancelled`,
but only its later staging job was cancelled (superseded the next day). The
`deploy-production` job had succeeded, so the run-level conclusion alone gave
the wrong answer.

**How to apply:**
- `gh api 'repos/<org>/<repo>/deployments?environment=production&per_page=10'`
  gives sha + ref. Per id, `…/deployments/<id>/statuses` gives
  queued → in_progress → success times. The `success` time is go-live.
- Build a small table: interval → sha → what changed, with the incident times
  as rows. Staging deploys of a branch don't count for a prod incident.
- When a run says cancelled or failed, read the per-job conclusions
  (`gh run view <id> --json jobs`) before saying whether it deployed.
- Then diff the build that *was* live against the one before it, and look for
  memory-shaped changes (caps, caches, concurrency).
- Name the suspect as a guess plus the query that would confirm it. A process
  killed by OOM may never record its last request, so "no traffic seen" is weak
  evidence.

**Signal:** "after we released…", "since the deploy…", an alert pasted with
timestamps, a suggestion to scale up.
**Next time:** first tool call is the deployments + statuses lookup, then the
time table, then the reply.

Related: [[read-the-gate-before-guessing]], [[outward-claims-carry-their-proof]].

**Evidence (the reverse case, 2026-11-02):** right after a prod deploy, a consumer
error with a new-looking message showed up in the logs. A 3-day `count(*)` of that
message showed it already peaking about 19 h before go-live, and lower after the deploy. It was a
pre-existing data bug, not the release. Same rule: before calling an error
"new since the deploy", put its count over time next to the go-live time.

**Watching a prod deploy** (2026-11-02, merged from watch-a-deploy-in-three-tabs).
Four questions in time order, one place each:
1. **Before merge:** baseline = memory-utilization peak over 1–2 weeks (APM's
   "compare with last week" covers latency, throughput and errors).
2. **T+0–10 min, CI:** the per-job `deploy-production` result, not the run's
   conclusion. Screenshots taken before it ran still show the old build.
3. **T+10 min, orchestrator:** new revision = target, old = 0, N/N running. Read each
   stopped task's reason now (they disappear after ~1 h): exit 137 or
   `OutOfMemoryError` = OOM; "scaling activity initiated by deployment" + exit 0 =
   normal trim.
4. **T+15–60 min, APM:** summary with compare-with-last-week, deploy marker on the
   right sha, logs continue past the marker. For any error that looks new, run the
   count-over-time check above before blaming the deploy.
5. **T+24 h:** memory peak ≤ baseline, no steady climb, no task restarts.
The log search box can turn free text into a broken field filter (0 rows); use the
query console with `LIKE`. Hand the steps over as a checklist with the click path,
one action per step.

**"What is live" = the latest `success` status time, not the newest record (2026-11-07).**
Deployment records are listed by creation time. A run created at 09:51 but approved at
18:01 sits below newer, never-approved records and is still the one live. Reading the
first `success` from the top reported the wrong branch, twice (the second time a
`per_page=15` window had cut the record off). Rank by the success status's
`created_at`, over a window wide enough to reach the oldest pending run.
