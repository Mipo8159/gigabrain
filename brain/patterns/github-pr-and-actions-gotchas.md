---
name: github-pr-and-actions-gotchas
description: "GitHub PR and Actions gotchas: a deleted bot comment can't be restored (re-run its workflow); 'had a problem deploying' rows are deletable deployment records; 'deleted a comment' events are permanent; in a monorepo, approve staging deploys from the PR's own file list, not the queued deploys; a run waiting on an approval only offers Cancel."
metadata:
  type: reference
---

**In short:** what can and can't be cleaned up on a GitHub PR page, checked
through the API on 2026-10-23.

| PR clutter | Fixable? | How |
|---|---|---|
| A deleted bot comment (e.g. an AI review) | Not restorable (no API or UI undelete) | Re-run that bot's latest workflow run on the head SHA: `gh run rerun <id>`. It posts a fresh comment, though the wording may differ. |
| "had a problem deploying … Error" rows | Yes | They are deployment records, often from deploy runs cancelled by the next push (run conclusion `cancelled`). `gh api -X DELETE repos/<o>/<r>/deployments/<id>` removes the row. It only works on non-active deployments. Keep the one that succeeded. |
| "X deleted a comment from Y" | No | It's an audit event. Neither the API nor admins can remove it. The only way out is a new PR, which loses the history, so leave it. |

**Why:** a user asked to "undo" a deleted bot comment and clear the error
rows. The comment couldn't come back, and the leftover audit line couldn't be
removed. Saying so up front saves rounds spent looking for an undelete.

**How to apply:** list first, change second:
`gh api 'repos/<o>/<r>/deployments?ref=<branch>'` with each deployment's
statuses, plus `gh run list --branch <branch>`. Show the delete/keep table,
then get one confirmation. Auto mode may still block these writes after the
user says yes. If it does, hand over `! <cmd>` lines (see
[[claude-permissions-are-wide-open]]).

**Signal:** a PR screenshot full of red "Error" deploy rows, or "I deleted the
bot's comment by accident".
**Next time:** answer which items are fixable and which aren't in the first
reply, then do the fixable ones after one confirmation.

## Monorepo PRs queue deploys they don't need (2026-11-02, merged from monorepo-pr-deploys-follow-ci-not-the-diff)

**Rule:** for "which waiting deploy should go to staging?", answer from the PR's own
file list (`gh pr view N --json files`, grouped by app dir), not from the queued
deploys. A deploy of an untouched app tests nothing and overwrites a teammate's PR on
shared staging. CI's affected-project detection fans out to every project when its
diff (event base SHA → merge commit) contains root files (workflows, workspace
config), often because the base is stale. Read the detect job's log
(`gh api --allow-escape-sequences repos/O/R/actions/jobs/<id>/logs`, strip ANSI) for
"Changed files" / "Affected projects", name why the extra one appeared (a guess unless
proven), and say a rebase or new push re-runs detection. Approving stays the human's click.

**No "Re-run" button (2026-11-04):** a run with any job waiting on an environment
approval counts as in progress, so GitHub shows only "Cancel workflow". Path: Cancel
workflow → open the job → Re-run jobs ▾ → Re-run this job. A reusable deploy job that
comes back *skipped* with every upstream green: trigger it via `workflow_dispatch`
on the branch instead of burning rounds.

**What's live on a monorepo env (2026-11-09):** every app deploys into the same
environment, so the newest deployment record there is usually *another* app's. For
"is my build still live?", list the env's deployments created after yours, open each
one's run (`statuses[].log_url`) and check its job names (`deploy-staging (<app>)`):
only a later success of *your* app's job replaces you. Approved-later records can sort
below yours by `created_at`, so page past the first screen.

**Syncing a PR resets its "deployed" badge (2026-11-09):** GitHub ties "This branch was
successfully deployed" to the head commit. Merging main into a PR that reviewers already saw
deployed + tested creates a new head with a *waiting* deploy, so the PR looks untested even
though staging still runs the tested build. Before syncing a staging-verified PR, say so and
offer: skip it, or sync then redeploy that one commit. `gh pr checks --watch` never exits
while a gated deploy check waits; poll and ignore `deploy-staging` instead.

**Signal:** two or more "Deploy / <app> (staging) … Waiting" checks plus "which one?",
or "where is rerun?". **Next time:** PR files + detect log before answering; give the
cancel-then-rerun path in the first answer.
