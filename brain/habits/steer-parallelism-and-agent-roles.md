---
name: steer-parallelism-and-agent-roles
description: "For any multi-part task, propose the concrete split up front: which phase runs in a background task, which in a worktree, which in a subagent role (analyze / fix / test / review)."
metadata:
  type: feedback
---

**In short:** at the start of a multi-part task, say exactly which parts run
in the background, in a worktree, or in a subagent, and launch your share.

Giga asked for this on 2026-10-02, and wants to learn it: worktrees,
background tasks, separate agent roles. A one-line "this could run in a
worktree" is not enough.

**Why:** in a debugging session with two bugs in two repos, everything ran one
after another in one context. Two log searches hit the 2-minute foreground
timeout before being moved to the background. A connection to a private
database hung for 2 minutes. The UI half (a 6-line change in a second repo)
waited for a backend investigation it didn't depend on. Giga rated the session
about 7/10 and named this as the gap. The same day it worked once: a `verifier`
checked cloud infrastructure and a `researcher` checked provider behaviour in
the background while Claude built the production image. Three layers finished
in one pass, saving ~9 minutes of checks in a row. Giga's standing ask since
then: "always squeeze the most out of agents, skills and hooks."

**How to apply.** In the first reply to a multi-part task, add a short "Split"
block that maps each phase to a tool. Then launch the parts that are Claude's
to launch:

| Phase | Default tool | Notes |
|---|---|---|
| Broad analysis (logs, many files, docs) | `Explore` or `researcher` subagent, or Bash with `run_in_background` | Anything that may take over ~60 s or floods the context. Keep the conclusion, not the dump. |
| Narrow analysis (one code path) | main session | Subagents start cold; not for a 3-file read. |
| Fixes in independent halves (backend repo vs UI repo) | a separate worktree that Giga launches: `cd <repo> && claude -w <task>` | Name the moment and the command. Giga launches it so they practise it. |
| Test / verify | `verifier` subagent in the background, or a one-shot `claude -p` | Reruns the original repro plus one nearby case. Reports VERIFIED, FAILED, PLAUSIBLE or BLOCKED. Use it before saying "confirmed". |
| Review | `reviewer` subagent in the background | Diffs over ~100 lines, or touching auth, money, data or infrastructure (CORE.md rule). |

Rules:
- **Check access before the first probe:** SSO login fresh, VPN or bastion for
  private databases, browser extension connected. Ask for all of them in the
  opening question batch, not one at a time as each fails.
- **Argue the split.** Parallel work has costs: agents start without context,
  merges can conflict, and it takes Giga's attention. Say which part stays in
  order and why. A small fix in one file gets no worktree.
- **The agent definitions** live in `gigabrain/global/agents/`: `researcher`,
  `reviewer` and `verifier` (added 2026-10-02, after Claude called a diagnosis
  "confirmed" too early). Propose a new role only after a session shows it
  would have been used, never in advance.
- How agents are discovered and overridden, and how to prove one loads: see
  [[claude-config-changes-need-human-installer]].

Related: [[working-style-interview-then-autonomous-loop]] (the split belongs in
that one up-front interview), [[giga-wants-argued-recommendations]].
