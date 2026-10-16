---
name: unattended-runs-keep-mac-awake
description: "Before Giga leaves a long workflow or eval queue running, keep the Mac awake (caffeinate). 2026-10-16: sleep killed 2 of 9 fact-check agents and turned one eval run into an error."
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

**Signal:** "I'll be away / overnight / while I sleep" plus local agents or evals.
**Next time:** put caffeinate in the plan before launching anything.

Related: [[kill-by-port-not-pkill-f]], [[fact-check-generated-knowledge]].
