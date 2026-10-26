---
name: local-only-edits-get-a-commit-guard
description: "Edits to TRACKED files that exist only to make a local run work (lockfile churn, local build-secret wiring) can't be hidden with .git/info/exclude. Guard them with local .git/hooks pre-commit + pre-push that refuse any path listed in .git/info/local-only (override env for deliberate ships). Untracked artefacts go in .git/info/exclude. Never use skip-worktree: it hides the change instead of guarding it."
metadata:
  type: feedback
---

**In short:** a local environment leaves changes to tracked files scattered
across repos: lockfile churn from installs, compose files wired for a
local secret. Giga wants to keep them and never push them. Make that
mechanical:
- a shared guard script in `~/.local/bin`
- per repo, `.git/hooks/pre-commit` and `pre-push` that call it
- per repo, a `.git/info/local-only` list of the protected paths

Everything under `.git/` stays local, so the guard can never be pushed itself.

**Why:** `.git/info/exclude` and `.gitignore` only affect *untracked* files.
`git update-index --skip-worktree` hides a tracked change from `status`.
That makes accidents more likely: the change is invisible, then it surprises
you on pull. "Remember not to `git add -A`" fails the first tired evening.
2026-10-22: 4 repos held 34 such files; Giga's words were "god forgive to push".

**How to apply:**
1. Find them: loop over every sibling repo and list `status --porcelain`
   plus unpushed commits, along with each file's mtime, to tell old churn
   from today's.
2. Untracked artefacts (build output) go in `.git/info/exclude`.
3. Tracked ones go in that repo's `.git/info/local-only` (seed it with `git
   diff --name-only`). Install the two hooks and check `core.hooksPath` is
   unset first, because husky and friends bypass `.git/hooks`.
4. pre-commit checks `git diff --cached --name-only`. pre-push checks every
   commit in the pushed range (remote sha..local sha, or `--not --remotes`
   for a new branch).
5. Deliberate ship: `ALLOW_LOCAL_ONLY=1 git commit|push`, for one command.
6. Prove it without risk: a throwaway repo with a bare local "remote"
   (commit blocked, other file allowed, push blocked, remote unchanged). Then
   run the real repo's hook against a *copy* of the index
   (`GIT_INDEX_FILE=<copy> git add …`), so the real staging area is never
   touched.

**Signal:** a local bring-up leaves `M` files in repos Giga doesn't
mean to change, or Giga says "keep it local, never push it".
**Next time:** run the sweep, then exclude or guard, then the throwaway-repo
proof, then save the rule to project memory so later sessions keep adding
new local-only paths to the list.

**Also instructions, not only hooks** (2026-10-26): Claude handed Giga a
`git commit -am` for a repo that held a local-only bypass file. A `git status`
before scripting the step caught it. Any commit command given to Giga in such a
repo stages explicit paths (`git add package.json package-lock.json`), and a
script checks that `git diff --name-only` is exactly the expected set.

Related: [[giga-commits-are-mine-to-make]], [[team-claude-md-gets-a-local-sibling]], [[secrets-land-in-readme]]
