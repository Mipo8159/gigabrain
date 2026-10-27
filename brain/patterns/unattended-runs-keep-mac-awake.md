---
name: unattended-runs-keep-mac-awake
description: "Sleep kills unattended runs (2026-10-16: 2 of 9 agents). Since 2026-10-28 the awake.py hook holds caffeinate -di per Claude turn + background job; manual caffeinate only for jobs started outside Claude."
metadata:
  type: feedback
---

**In short:** a long unattended run on Giga's laptop dies when the Mac sleeps.
Say so before he leaves, and give him the one command.

**Why:** 2026-10-15/16, overnight fact-check workflow. Two of 9 agents failed
with "Your computer went to sleep mid-response". They left unlogged edits that
needed an extra verifier pass. One process-eval run became `err`, and a 30-min
eval took 10 h of wall time. Nobody was there to restart anything.

**How to apply:**
- When Giga says he'll be away and the work runs locally, the plan's first line
  is: `! caffeinate -dimsu &` (or run the job under `caffeinate -i <cmd>`).
- Have each agent log as it goes (append per file), so a dead agent's partial
  work can be verified and reused instead of redone.
- After the run, look for agents that died with partial edits. Verify their
  unlogged changes before handover.

**Daytime too (2026-10-23):** a 2-repo smoke run of a background workflow,
launched mid-afternoon, died after 4.5 h when Giga stepped away ("Your computer
went to sleep mid-response", 3 of 4 agents). A background reviewer launched
at the same time still showed "running" 6 h later and never reported: a hung
agent, not a slow one. The finished inventory agent replayed from cache on resume.
- Any background workflow or agent expected to take over ~10 min gets
  `caffeinate -dimsu -t <seconds>` as a background command in the same turn.
- A background agent "running" for hours after a sleep is dead: check
  `ListAgents`, stop it and relaunch; resume workflows by run id.

**Automated (2026-10-28):** the rule kept depending on someone remembering it,
so it became a hook: `global/hooks/awake.py` (installed by `bin/install.sh`).
It holds `caffeinate -di -w <claude pid>` from prompt submit to Stop, and keeps a
timed hold (default 4 h, `GIGABRAIN_AWAKE_PIN_HOURS`) after a turn that launched a
Workflow, Agent or background Bash. Proof: 8 `bin/kit selftest` cases plus a live
`pmset -g assertions` check. Off: `GIGABRAIN_AWAKE=0`.
- Inside Claude: nothing to remember. A background job over 4 h still needs a
  manual `caffeinate -i -t <secs>`.
- Outside Claude (a terminal `bin/eval-*`, a cron job): still wrap in `caffeinate -i`.
- Lid closed on battery still sleeps; say so before an overnight run.

**Signal:** "I'll be away / overnight / while I sleep" plus local agents or evals.
**Next time:** for runs over 4 h or started outside Claude, put caffeinate in the plan; otherwise trust the hook.

Related: [[kill-by-port-not-pkill-f]], [[fact-check-generated-knowledge]].
