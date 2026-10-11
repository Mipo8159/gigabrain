---
name: steer-parallelism-and-agent-roles
description: "For any multi-part task, propose the concrete split up front: which phase runs in a background task, which in a worktree, which in a subagent role (analyze / fix / test / review)."
metadata:
  type: feedback
---

Giga asked (2026-10-02) for Claude to keep a standing parallel-work mindset and
help them learn it: worktrees, background tasks, and separate agent roles for
analyze → fix → test → review. A one-line "this could run in a worktree" is not
enough; propose the **concrete split** before starting.

**Why:** in a two-bug, two-repo debugging session everything ran serially in one
context. Two log sweeps hit the 2-minute foreground timeout before being moved to
the background, a private-DB connection hung for 2 minutes, and the UI half
(a 6-line change in a second repo) waited for the backend investigation it did
not depend on. Giga rated the session ~7/10 and named this as the gap.
The same day it worked once: a `verifier` on cloud infra and a `researcher`
on provider semantics ran in the background while Claude built the production
image, so three layers were done in one wall-clock pass (~9 min of infra checks
that would otherwise have run serially). Giga's standing ask since then is to
"always squeeze the most out of agents, skills and hooks."

**How to apply.** In the first reply to a multi-part task, add a short
"Split" block mapping each phase to a tool, then launch the parts that are
Claude's to launch:

| Phase | Default tool | Notes |
|---|---|---|
| Analyze, broad (logs, many files, docs) | `Explore` / `researcher` subagent, or Bash `run_in_background` | Anything that may exceed ~60 s or floods context. Keep the conclusion, not the dump. |
| Analyze, narrow (one code path) | main session | Subagents start cold; don't spawn for a 3-file read. |
| Fix, independent halves (backend vs UI repo) | separate worktree, launched by Giga: `cd <repo> && claude -w <task>` | Name the moment and the command; Giga launches it so they practise it. |
| Test / verify | `verifier` subagent in the background, or `claude -p` one-shot | Reruns the original repro plus one neighbour; reports VERIFIED / FAILED / PLAUSIBLE / BLOCKED. Use it before saying "confirmed". |
| Review | `reviewer` subagent in the background | Over ~100 lines, or auth/money/data/infra (CORE.md rule). |

Rules:
- **Check access before the first probe:** SSO fresh, VPN or bastion for private
  DBs, browser extension connected. Ask for all of them in the opening question
  batch, not one by one as each fails.
- **Argue the split.** Parallelism has costs: cold-start context, merge
  conflicts, and Giga's attention. Say which part stays serial and why. A small
  single-file fix does not get a worktree.
- **Separate agent configs** live in `gigaforge/global/agents/`: `researcher`,
  `reviewer`, `verifier` (added 2026-10-02 after Claude called a diagnosis
  "confirmed" too early). Propose a new role only when a session shows it would
  have been used, never pre-emptively.
- Discovery, overrides and how to prove an agent loads: see
  [[claude-config-changes-need-human-installer]].

Related: [[working-style-interview-then-autonomous-loop]] (the split belongs in
that one up-front interview), [[giga-wants-argued-recommendations]].
