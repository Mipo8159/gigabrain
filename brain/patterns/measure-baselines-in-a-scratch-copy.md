---
name: measure-baselines-in-a-scratch-copy
description: "To measure 'before' (a test without the fix, an audit on the old lockfile), work in a scratch copy or read old files with `git show HEAD:<file>`; never stash, checkout or reset in the user's working tree, and never chain a state-changing git command onto a read-only one."
metadata:
  type: feedback
---

**In short:** the user's working tree is read-only while you measure. Every
"before" number comes from a copy.

**Why:** 2026-10-23, a work repo, uncommitted feature on a branch. To get the
red-first test run and the before/after `npm audit`, Claude copied the repo to
the scratchpad (good), but tacked `git stash -- package.json package-lock.json`
onto the end of an audit command in the *real* repo. The stash ran and the
user's dependency changes disappeared from the tree. They were restored by
`git stash pop` a minute later, with the diff stat matching, but only because
the next command checked `git status`. Same session: `rsync --exclude dist`
also dropped every `node_modules/*/dist`, so the scratch build failed with a
misleading `tsc` error about `pg-protocol`.

**How to apply:**
- For the old version of a file use `git show HEAD:<file> > <scratch>/<file>`. For a whole "without the fix" run, copy the repo to the scratchpad and revert there.
- Copy with root-anchored excludes: `rsync -a --exclude /dist ./ <scratch>/`. An unanchored pattern matches at every depth.
- Keep state-changing git commands (`stash`, `checkout`, `reset`, `restore`) in their own Bash call, never chained after `&&` or `;`, so each one is a deliberate act.
- If one slips through anyway, run `git status` / `git stash list` at once, restore, compare `git diff --stat` with the earlier one, and say so in the reply.

**Signal:** the plan says "red first" or "audit before/after" while the user's uncommitted work sits in the tree.
**Next time:** copy to the scratchpad first, measure there, and touch the real tree only for the final green run.

Related: [[outward-claims-carry-their-proof]], [[shared-library-dependency-updates]].
