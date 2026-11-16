---
name: replay-every-commit-after-rewriting-history
description: "After any fixup/autosquash/reset rebuild of a commit series, re-run tests per commit, not just at HEAD: a fixup made while git-rm deletions were staged moved them into the wrong commit, leaving a commit that could not load, with HEAD fully green."
metadata:
  type: feedback
---

**Rule:** after rewriting a series (fixup + autosquash, soft reset + recommit), check
out each commit and run its tests and typecheck. HEAD green says nothing about the
commits in between. Before every `git commit --fixup`, run `git status`: the fixup
takes everything staged, not just the file you meant.

**Why:** 2026-11-16, work repo: `git rm` of 5 old files was staged, then a test file was
added and committed as a fixup. Autosquash put the 5 deletions into the "tests" commit,
so that commit deleted the code its tests needed (MODULE_NOT_FOUND). The final tree was
right and every HEAD run was green. Only the per-commit replay found it. Fix: soft-reset
to the base, recommit in two parts, and check that the final tree hash is identical.

**How to apply:** keep a replay script (per commit: checkout, test, typecheck, formatter
on touched files; print one line per commit) and run it after every history edit, before
saying the series is clean. Compare `git rev-parse HEAD^{tree}` before and after a rebuild.

**Signal:** a fixup, autosquash, split or reorder in a series meant to be reviewed commit by commit.

**Next time:** `git status` → fixup → autosquash → replay → tree-hash compare.
