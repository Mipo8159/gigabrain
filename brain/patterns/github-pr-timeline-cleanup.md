---
name: github-pr-timeline-cleanup
description: "Tidying a GitHub PR: a deleted comment can't be restored (re-run the bot's workflow to repost); 'had a problem deploying' rows are deployment records you can DELETE; 'deleted a comment' timeline events are permanent."
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
