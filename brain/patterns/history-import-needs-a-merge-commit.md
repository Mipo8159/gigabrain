---
name: history-import-needs-a-merge-commit
description: "Importing a repo's git history into a monorepo (filter-repo + --allow-unrelated-histories) only survives if the PR lands as a merge commit; a squash merge silently flattens it. Check the past moves' parent counts and ask for a merge commit up front."
metadata:
  type: feedback
---

**In short:** a history import is a merge. Squash the PR and the imported
history is gone from main, even though the branch had all of it.

**Why:** 2026-11-10, work monorepo. Its migration playbook says to import each
old repo with `git filter-repo --to-subdirectory-filter <dir>` and then
`git merge --allow-unrelated-histories`. Checking how earlier moves landed:
only the first move's PR was a real merge commit (2 parents); the next four
were squash-merged (1 parent each). `git log --oneline -- <dir>` on main showed
3 commits for one moved project against 48 for the one that was merged. The
playbook never mentioned the merge method, and the repo allows both.

**How to apply:**
- Before following a "keep the history" recipe, measure the precedent:
  `git rev-list --parents -n1 <merge sha>` (count the parents) and
  `git log --oneline -- <moved dir> | wc -l` per earlier move.
- Ask the reviewer or repo owner for a merge commit on the import PR, in the PR
  body, before review starts. Squash is often the default button.
- If squash is forced, say in the PR that history stays in the archived source
  repo, so nobody believes `git blame` in the monorepo.

**Signal:** a migration ticket or playbook says "import history", "filter-repo",
or "allow-unrelated-histories".
**Next time:** count the parents on the last move's PR first, then name the
merge method in the PR body.
