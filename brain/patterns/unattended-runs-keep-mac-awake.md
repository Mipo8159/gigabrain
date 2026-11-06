---
name: unattended-runs-keep-mac-awake
description: "Sleep kills unattended runs (2026-10-16: 2 of 9 agents). Since 2026-10-28 the awake.py hook holds caffeinate -di per Claude turn + background job; manual caffeinate only for jobs started outside Claude."
metadata:
  type: feedback
---

**In short:** inside Claude the `global/hooks/awake.py` hook keeps the Mac awake
(`caffeinate -di -w <claude pid>` from prompt submit to Stop, plus a timed hold,
default 4 h via `GIGABRAIN_AWAKE_PIN_HOURS`, after a turn that launched a Workflow,
Agent or background Bash; off with `GIGABRAIN_AWAKE=0`). Manual caffeinate is only
for the cases it doesn't cover.

**Why:** sleep killed unattended runs twice before the hook: 2026-10-15/16, 2 of 9
overnight agents died mid-response with unlogged edits (a 30-min eval took 10 h);
2026-10-23, a daytime smoke run died after 4.5 h (3 of 4 agents) and a background
reviewer still showed "running" 6 h later. The rule kept depending on memory, so it
became the hook (8 `bin/kit selftest` cases plus a live `pmset -g assertions` check).

**How to apply:**
- A background job expected to run over 4 h: add `caffeinate -i -t <secs>` yourself.
- Jobs started outside Claude (a terminal `bin/eval-*`, cron): wrap in `caffeinate -i`.
- Lid closed on battery still sleeps: say so before an overnight run.
- Have each agent log as it goes (append per file), so a dead agent's partial work
  can be verified and reused. After the run, verify unlogged changes from agents that died.
- A background agent "running" for hours after a sleep is dead: check `ListAgents`,
  stop and relaunch; resume workflows by run id.

**Signal:** "I'll be away / overnight / while I sleep" plus local agents or evals.
**Next time:** for runs over 4 h or started outside Claude, put caffeinate in the
plan; otherwise trust the hook.

Related: [[kill-by-port-not-pkill-f]], [[fact-check-generated-knowledge]].
