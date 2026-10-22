---
name: worktrees-and-agent-teams
description: "When to use a worktree (`claude -w`), a subagent, or an agent team, how to run each, and what each costs. Checked against code.claude.com docs 2026-10-17 (Claude Code 2.1.302); teams are experimental."
metadata:
  type: reference
---

**In short:** a **subagent** is a helper that reports back, a **worktree** is a
second desk with its own checkout, and an **agent team** is a meeting: peers
who message each other. Pick the smallest one that fits.

| Need | Use | Why not the others |
|---|---|---|
| A focused answer (search, review, verify) where only the result matters | subagent (`reviewer`, `verifier`, `Explore`, `researcher`) | Cheapest. A team adds chatter, a worktree adds a checkout. |
| Two changes that touch files at the same time (backend + UI, two features, a risky experiment) | worktree, one session each | Subagents in one checkout overwrite each other's edits. |
| Work where the parts must argue: competing bug hypotheses, a review with security, performance and tests lenses, a cross-layer feature with an owner per layer | agent team (3–5 teammates) | Subagents can't talk to each other. Each only reports to the parent, so nobody challenges a weak finding. |

## Worktrees: a second desk

**Run it** (docs: code.claude.com/docs/en/worktrees):
- `claude -w <name>` creates `.claude/worktrees/<name>/` on branch
  `worktree-<name>`, by default from the remote default branch
  (`worktree.baseRef`: `"fresh"`, or `"head"` to branch from where you are).
- Gitignored files aren't copied. List the ones a run needs (`.env`,
  `.env.local`) in `.worktreeinclude` at the repo root, in gitignore syntax.
- On exit: a clean worktree without a name is removed. Otherwise you're asked
  whether to keep it. Resume with `claude -w <name> --resume`.
- Merge the way you would a teammate's branch: review the diff, then
  `git merge worktree-<name>`. Under the "never commit" rule, Claude leaves
  the worktree branch uncommitted and you commit it.
- Subagents can have their own worktree: `isolation: worktree` in the agent's
  frontmatter. It's removed automatically if the agent changed nothing.
- In the statusline the branch shows as `wt:<branch>`, so you can tell which
  desk you're at.

**What you gain:**
- Two Claude sessions in parallel with no edit collisions. The 2026-10-02 UI
  fix (6 lines in a second repo) waited on a backend investigation it didn't
  depend on. With a worktree it would have shipped while the backend was
  still being investigated.
- Risky experiments are cheap: if one fails, delete the worktree, and main
  was never touched.
- Each desk keeps its context small, which is the "one goal per session"
  coaching focus done mechanically.

**Cost:** a cold start (the new session doesn't know what the first one
learned, so seed it with a 5-line brief). You also do the merge, and two
sessions draw from one rate limit.

**Gotchas (seen 2026-10-22, first `claude -w` session):**
- The worktree sits *inside* the main checkout (`.claude/worktrees/<name>/`),
  so any tool whose config cascades up the directory tree also reads the
  parent's config. Example: a legacy `.eslintrc.js` with no `root: true` loads the
  outer checkout's config, which has no `node_modules`. Lint fails on unchanged code
  ("couldn't find the config airbnb-base"). Prove that with a baseline run, then use
  `npx eslint --no-eslintrc -c .eslintrc.js …`. A fresh clone and CI don't hit it.
- The session is isolated. It refuses git commands aimed at another repo
  (`cd ~/other && git …`) and commands with a runtime-computed value it can't
  verify (`VAR=${VAR:-x} npm …`). Split them into plain commands. Work that
  touches another repo (such as a retro commit) may need its own session.
- **Uncommitted worktree work isn't durable.** Under "never commit", the fix
  exists only as working-tree edits, and removing the worktree deletes them.
  On 2026-10-22 a proven 13-line fix (red→green repro) was gone hours later:
  no worktree, no branch, no stash. The handoff note still listed it as "Worked".
  **Next time:** before a worktree session ends with uncommitted work, run
  `git diff > <project memory dir>/<name>.patch` and name the patch in the
  handoff, or ask Giga to commit locally to the worktree branch (no push).
**Signal:** a build or lint failure in a worktree that the same code doesn't
show elsewhere. **Next time:** run the baseline first; if it fails before your
change too, suspect config cascading up the directory tree.

## Agent teams: a meeting

**Turn it on:** `bin/install.sh` sets `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`
(opted in 2026-10-17). Set it to `"0"` to turn teams off.

**Run it** (docs: code.claude.com/docs/en/agent-teams), in an interactive
session (not `-p`), in plain language:
> "Spawn 3 teammates: one argues the bug is in the cache layer, one in the
> consumer offset handling, one in the DB transaction. Have them try to
> disprove each other, then report the surviving hypothesis with evidence."

- Teammates message each other by name and share a task list
  (`~/.claude/tasks/<team>/`). The lead is notified when one goes idle.
- Display: `teammateMode` is `"in-process"` (the default), `"auto"`, `"tmux"`
  or `"iterm2"`. Split panes in iTerm2 need the `it2` CLI.
- Limits: one team per session, no nested teams, a fixed lead, and
  permissions set at spawn. `/resume` and `/rewind` don't bring back
  in-process teammates. Shutdown can be slow.

**What you gain:**
- Findings that have survived someone else's challenge. A team suits
  debugging with competing hypotheses (the `debug-protocol` step "rank
  hypotheses, test the cheapest discriminating one", run in parallel) and
  multi-lens review.
- A cross-layer feature (API + consumer + tests) where each owner checks the
  contract with the others directly, instead of through you.

**Cost (the docs say so too):** "significantly more tokens than a single
session". Start with 3–5 teammates. It's experimental, and a side effect of
the flag is that named subagents (`reviewer`, `verifier`) may launch as
teammates. If a background review starts acting like a teammate, that is the
cause.

## Rules
- Default to a subagent. Move up to a worktree only when **files collide**,
  and to a team only when the **parts must disagree**.
- Name the choice in the "Split" block
  ([[steer-parallelism-and-agent-roles]]). You launch the worktrees; Claude
  launches subagents and teams.
- Give every parallel worker its own work dir and absolute paths
  ([[shared-kit-and-checker-before-fan-out]]).
- Long unattended runs: `caffeinate -i` ([[unattended-runs-keep-mac-awake]]).
