---
name: merge-can-be-a-deploy-pin-the-abort-line-first
description: "Before merging PRs whose pipeline deploys on push, read each repo's environment protection (merge may BE the prod deploy), write the per-service abort criteria, and prove the alarm fires — before the merge, not after the data."
metadata:
  type: feedback
---

**In short:** "merge" and "deploy" are often the same click. Read the gate,
pin the abort line and test the alarm before you merge, then watch.

**Why:** 2026-11-09, work repo, 6 service PRs (a shared-library bump) merged
at once on request. Only on the merge question did Claude check the
repos' deploy environments: 5 of 6 had **no approval gate on production**
(last prod runs went queued → in_progress → success), so merging = 5 prod
deploys at the same minute, one of them with a head that staging never ran.
Giga still chose "all at once", but the choice became informed only because
the check ran first. Afterwards the watchdog limits (p95 per service, throughput
and log floors) were set *after* seeing post-deploy data, the agreed "+5% p95"
rule was quietly dropped as unusable on noisy traffic, and the alert path was
never proven until a `selftest` (limit forced to 0) was added at the end.
No harm (all healthy), but a real regression would have met an untested alarm
with limits chosen by eye.

**How to apply:**
1. Per repo: `gh api repos/<o>/<r>/environments` → which environment the
   deploy job uses and its `protection_rules`; confirm with the last prod
   run's status timeline (`waiting` present = gated). Say "merge = deploy for
   N repos" before anyone clicks.
2. Write the abort criteria per service from pre-deploy + same-clock-last-week
   baselines: error rate, p95 cap, throughput floor, log/metric liveness,
   plus a minimum sample size below which only liveness counts. Get them
   agreed with the decider before merging.
3. Prove the alarm fires once (force a limit to 0 and see `ALERT`), then arm
   it. Find the rollback run for each service before you need it.
3b. Re-measure the go criterion in the minutes before the click and quote it
   "as of HH:MM". A monitor's last reading expires when the monitor stops.
   2026-11-12: "zero since 19:39" was repeated for 5 hours after the watcher
   ended; the pre-merge check found 52 hits, the last 7 minutes earlier, and
   stopped a merge Giga had already said go to.
4. Prefer one service at a time with a short gate; if the human picks
   "all at once", note that a breach can't be pinned to one service.
5. Read the live workflow's `needs:` graph, not the repo's docs about it.
   2026-11-10, a monorepo whose shared deploy workflow ran
   `changeset-production` with `needs: ci` only: a merge to main deployed
   prod while the staging deploy still waited for approval, and the
   migration playbook described the staging gate in the wrong order. Staging
   proof then has to happen on the PR, before the merge.

6. Read the deploy workflow's `concurrency:` block too. 2026-11-10, a monorepo
   whose main-branch runs queue (`cancel-in-progress: false` on push, by design):
   an older run had finished prod but sat 9 h waiting for a staging approval, so
   the next merge's prod deploy would queue behind it indefinitely, and a third
   push would silently replace the pending run (whose affected set came from
   `github.event.before`, so the change would never deploy). Fix: settle the
   stuck run first (cancel it or approve it) and, after the merge, confirm the
   prod job for *your* change actually ran. Also leave your own run's staging job
   settled, or you recreate the block for the next person. Repos differ: in the
   same rollout one repo auto-deployed prod on merge, another gated both
   environments behind a reviewer, so merge alone touched nothing there.

**Signal:** "merge them", "squash and merge all", "ship it", a PR set whose
CI has a `deploy-production` job, "monitor and abort on anomalies".
**Next time:** environments check + abort table + alarm selftest in the
same reply as the merge question.

Related: [[judge-a-deploy-against-like-for-like-baselines]], [[a-test-must-be-able-to-fail]], [[line-up-incident-times-with-deploy-history]], [[github-pr-and-actions-gotchas]]
