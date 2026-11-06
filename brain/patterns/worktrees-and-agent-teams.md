---
name: worktrees-and-agent-teams
description: "How to run a worktree (`claude -w`) or an agent team, what each costs, and the gotchas seen so far. Which one to pick lives in steer-parallelism-and-agent-roles. Checked against code.claude.com docs 2026-10-17 (Claude Code 2.1.302); teams are experimental, re-check the live docs before relying on details."
metadata:
  type: reference
---

**In short:** a **subagent** is a helper that reports back, a **worktree** is a
second desk with its own checkout, and an **agent team** is a meeting: peers
who message each other. The picking rule (smallest that fits) is in
[[steer-parallelism-and-agent-roles]].

| Need | Use | Why not the others |
|---|---|---|
| A focused answer (search, review, verify) where only the result matters | subagent (`reviewer`, `verifier`, `Explore`, `researcher`) | Cheapest. A team adds chatter, a worktree adds a checkout. |
| Two changes that touch files at the same time (backend + UI, a risky experiment) | worktree, one session each | Subagents in one checkout overwrite each other's edits. |
| Parts that must argue: competing bug hypotheses, multi-lens review, a cross-layer feature with an owner per layer | agent team (3–5 teammates) | Subagents can't talk to each other, so nobody challenges a weak finding. |

## Worktrees: a second desk

**Run it** (docs: code.claude.com/docs/en/worktrees):
- `claude -w <name>` creates `.claude/worktrees/<name>/` on branch
  `worktree-<name>`, by default from the remote default branch
  (`worktree.baseRef`: `"fresh"`, or `"head"` to branch from where you are).
- Gitignored files aren't copied: list the ones a run needs (`.env`) in
  `.worktreeinclude` at the repo root, in gitignore syntax.
  When the missing file is a secret, never copy it: a config check (`docker compose
  config`) runs fine on empty placeholders for the gitignored override and secret
  files, deleted right after (2026-11-06; the user's command failed on the
  missing override, and placeholders gave a clean pass).
- On exit a clean unnamed worktree is removed; otherwise you're asked. Resume with
  `claude -w <name> --resume`. Merge like a teammate's branch:
  `git merge worktree-<name>` after review (Giga commits).
- Subagents can get their own: `isolation: worktree` in the agent's frontmatter.
- **Cost:** a cold start (seed it with a 5-line brief), you do the merge, and both
  sessions share one rate limit.

**Gotchas (first `claude -w` session, 2026-10-22, and after):**
- The worktree sits *inside* the main checkout, so config that cascades up the tree
  is read from the parent too. A legacy `.eslintrc.js` without `root: true` failed
  on unchanged code; use `npx eslint --no-eslintrc -c .eslintrc.js …`. Signal: a
  build or lint failure the same code doesn't show elsewhere; run the baseline first.
- The session is isolated: it refuses git commands aimed at another repo
  (`cd ~/other && git …`) and runtime-computed values (`VAR=${VAR:-x} npm …`). Split
  them into plain commands; cross-repo work (a retro commit) may need its own session.
- **Uncommitted worktree work isn't durable.** Removing the worktree deletes it; a
  proven 13-line fix vanished that way (2026-10-22). Before the session ends, run
  `git diff > <project memory dir>/<name>.patch` and name the patch in the handoff,
  or ask Giga to commit locally to the worktree branch (no push).
- **Leave the reason behind (2026-10-27).** When creating a worktree, put one line in
  the project handoff ("worktree <path>: <why>, remove after <event>") and tell the
  user then. Before calling an artifact's origin unknown, grep `me/scorecard.md`, the
  journal and the handoffs. Before moving work out, check `git status` in the main
  checkout: a dirty main checkout is usually why the worktree exists.

## Agent teams: a meeting

**Turn it on:** `bin/install.sh` sets `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`
(opted in 2026-10-17; `"0"` turns it off).

**Run it** (docs: code.claude.com/docs/en/agent-teams), interactive only (not `-p`):
> "Spawn 3 teammates: one argues the bug is in the cache layer, one in the
> consumer offset handling, one in the DB transaction. Have them try to
> disprove each other, then report the surviving hypothesis with evidence."

- Teammates message each other by name and share a task list
  (`~/.claude/tasks/<team>/`). Display via `teammateMode` (`in-process` default,
  `tmux`, `iterm2`, which needs the `it2` CLI).
- Limits: one team per session, no nesting, a fixed lead, permissions set at spawn;
  `/resume` and `/rewind` don't bring back in-process teammates.
- **Cost:** "significantly more tokens than a single session" (docs). Side effect of
  the flag: named subagents (`reviewer`, `verifier`) may launch as teammates; if a
  background review acts like a teammate, that's why.
- Gain: findings that survived someone else's challenge (the `debug-protocol` step
  "rank hypotheses, test the cheapest discriminating one", run in parallel).
