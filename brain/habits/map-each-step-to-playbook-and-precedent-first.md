---
name: map-each-step-to-playbook-and-precedent-first
description: "In a repo with a migration playbook or prior migrations, map every decision of the next step to the playbook rule and the precedent commit BEFORE proposing the plan, and measure fit (run our own tests against the shared module) instead of judging it. Giga calls a plan that passes tests but breaks the playbook a false positive."
metadata:
  type: feedback
---

**Rule:** before proposing step N, write one row per decision: playbook rule · precedent
commit · measured fit. Claims about tooling ("that gate isn't running yet") are also
asked of the tool (`<runner> project <name>`), not inferred from which files exist.

**Why:** 2026-11-16, work repo: I proposed a plain port of a config module. It would
have passed every test, but the playbook says to build it through the shared helper, as
13 earlier migrations did. Only Giga's audit question caught it: "this is precisely what
I am trying to avoid. false positives. hadn't I asked…". Once the step was redone this
way, the measurement decided two calls: the shared auth module failed 9 of 11 of our own
tests (so we kept the local one, with the reason noted), and pins caught a shape bug the
shared config helper adds (nested sections missing when the env is unset). Same session:
I had told Giga lint/format "don't run until moon.yml exists". The task runner showed it
infers the project from a glob, and both gates were already red in PR CI.

**Also the ticket itself:** 2026-11-17, same work repo: four items of the ticket's own
checklist (post-deploy functional-test gate, a doc to carry instead of delete, an assumed
pre-check that was false, a secrets plan we deviated from) surfaced only when Giga asked an
unrelated "why this folder?" and I reread the ticket. Before calling a step done, diff the
work against every numbered item of the ticket and list each as done / deviated (why) / open.

**How to apply:** grep the playbook for the step's files; `git log` the earliest and
latest migrations for the same file; when a shared module could replace ours, run our
tests against it and quote the count; state the plan only after the table.

**Mark each decision decided or open (2026-11-20, same kind of work):** a plan listed two
values as "recommended" (a timeout, a schedule). Several steps later they had quietly become
"plan" and nearly went into a deploy template unconfirmed; they were asked only when the
template encoded them. The table gets a column: decided by Giga (date) or open. An open row
that the step encodes goes into the step's one question batch, before the edit.

**Signal:** "follow precedent", "don't invent a new wheel", a `docs/migration*.md`, or a
step that touches a file that every earlier migration also touched.

**Next time:** open the step's reply with that table; no table, no plan.
