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

**Same root, other shapes (2026-11-16):** (1) parallel agents in one tree staged `git mv`
renames; a plain `git commit` of 3 files took 87. Commit with `git commit --only <paths>`
while anyone else edits the tree. (2) Listing a batch's paths from `git diff --cached`
without `--no-renames` shows renames by the new name only, so the deletions were left out.
(3) A replay that symlinks today's `node_modules` into each old snapshot lies both ways
(old commits went red once a dependency was removed; the pre-workspace import "passed"
on borrowed deps). Each snapshot installs from its own lockfile (`pnpm install --offline
--frozen-lockfile`) and builds its own workspace packages in dependency order.

**Stacking a series onto an unmerged PR (2026-11-20).** To build on a teammate's
open PR, a 12-step local series (first commit = a merge that imports another repo's
history as a separate root) was moved onto the PR head.
- Don't `git rebase` a history-import merge: it replays the imported root's commits.
  Recreate the merge on the new base with the same second parent (tree of the
  imported dir must hash-equal the old one), then `cherry-pick` the first-parent
  commits in order (`git rev-list --first-parent --reverse <merge>..<old-head>`).
- Lockfile conflicts: take the new base's lockfile and regenerate it
  (`pnpm install --offline --lockfile-only`), never hand-merge; accept only when the
  importer block and the added/removed package set equal the ORIGINAL commit's.
- Proof per step: for every old/new pair, the moved dirs' tree hashes, message and
  author+date are identical (11/11), plus a backup branch at the old head.
- Package-manager supply-chain checks can fail on the combined lockfile even when
  every entry is byte-identical to an already-verified lockfile. Skipping the check
  (`--trust-lockfile`) is a human's decision: show the entry-by-entry identity proof
  and let them run it. Reusing one install in a snapshot is then fine only when the
  snapshot's lockfile is byte-identical (see (3) above for why it lies otherwise).
**Signal:** "stack on <open PR>", "rebase onto their branch", a merge commit in the series.
**Next time:** backup branch → recreate merge → cherry-pick first-parent → regenerate lock → per-step hash compare → gate.
