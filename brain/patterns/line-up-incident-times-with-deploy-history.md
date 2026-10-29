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
