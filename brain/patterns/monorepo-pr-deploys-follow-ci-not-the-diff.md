---
name: monorepo-pr-deploys-follow-ci-not-the-diff
description: "In a monorepo, a PR can queue staging deploys for apps it never touches: CI's affected-project detection fans out on root-file changes or a stale base. Advise which deploy to approve from the PR's own file list, then explain the extra one from the detect job's log."
metadata:
  type: feedback
---

**Rule:** when a monorepo PR shows several "waiting" deploys and the question is
"which one should go to staging", answer from the PR's own file list
(`gh pr view N --json files`), not from the list of queued deploys. Deploy only the
apps the diff touches. A deploy of an untouched app tests nothing and overwrites
whatever a teammate's PR has on that shared staging host.

**Why:** 2026-11-02, a frontend monorepo: every file in the PR sat under one app, but
the CI "changes" job listed every project. Its diff (event base SHA to merge commit)
contained root files the PR never changed (workflows, the moon workspace config), and
any root-file change fans out to all projects. The base SHA was probably stale. The
queued deploys looked like "this PR changes both apps".

**How to apply:** (1) PR files, grouped by app dir; (2) the detect job's log
(`gh api --allow-escape-sequences repos/O/R/actions/jobs/<id>/logs`, then strip ANSI
codes) for "Changed files" / "Affected projects"; (3) recommend the touched app only,
name why the extra one appeared (as a guess unless proven), and say a rebase or new
push re-runs detection.

**Signal:** a screenshot of two or more "Deploy / <app> (staging) … Waiting" checks
plus "which one?".
**Next time:** run steps 1 and 2 before answering. Approving stays the human's click.
