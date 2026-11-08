---
name: rung-gate-before-work
description: "Before any work-starting prompt runs: grade it on the AI-engineering ladder, show the upgraded prompt, ask for the missing inputs in one batch, and start only after Giga confirms."
metadata:
  type: feedback
---

**In short:** a real task never starts from the prompt as typed. Claude first shows
how far up the ladder the prompt reached, rewrites it one rung higher, asks Giga for
what only Giga knows, and runs the *upgraded* prompt.

Giga asked for this on 2026-11-08: "I need something that corrects me before the
command runs … so my request gets turned into the request you mentioned, even if it
means me giving extra input … goal being me taken to higher rung stages, eventually
comparable to AI engineer." Trigger example (graded 6/10): "investigate all 6
deployments on new relic … done when you feel confident that their measurements are
stable". It had scope and a per-item loop, but its done-line was the model's own
feeling, with no baseline, thresholds, queries or "can't tell" outcome, and no split.

**Why:** lesson `ai-map` (2026-11-06) placed Giga on rung 1 with rung-3 tools.
Reminders after the fact (the 💡 line) moved done-lines from 10% to 62% of prompts
in a month, but a tip arrives after the work is done. A gate before the work teaches
at the moment the prompt is written and makes the run better as well.

## The ladder (from lesson ai-map)

| Rung | Name | A prompt at this rung has… |
|---|---|---|
| 0 | Prompter | a goal in plain words |
| 1 | Director | + scope ("all 6") and a done-line |
| 2 | Context engineer | + the done-line is **checkable** (numbers, thresholds, a test, a query to rerun), the baseline/environment named, and the context pointed at (which files, dashboards, entities) |
| 3 | Orchestrator | + a **split** (subagents per independent item, background review, worktree), a boundary (read-only / ask first / don't push), and a fixed **output shape** each part returns |
| 4 | Builder | + the result is reusable: a script, a skill, a saved query, a check that runs again next time |
| 5 | Evaluator | + it's measured over many runs: an eval, a pass rate, cost and time per run, a "can't tell" path and known failure modes |

## The rubric (what the gate checks)

1. **Goal and scope:** what exactly, and every item named.
2. **Checkable done-line:** observable and numeric, never "when you feel confident",
   "make sure" or "looks good". The model's confidence is generated text, not proof.
3. **Baseline / environment:** compared to what, and where (staging or prod, which window).
4. **Context pointers:** where to look (repo, file, NR entity, ticket).
5. **Evidence:** proof Giga can rerun (the query, the command, the test output).
6. **Boundary and decision owner:** read-only, ask before X, the go/no-go is Giga's.
7. **Uncertainty path:** what counts as "can't tell" (low traffic, missing data).
8. **Split and output shape:** independent parts go to parallel agents, each returning a fixed table.

## How to apply

When the coach hook emits the **Rung gate** cue (a work-starting prompt), the first
reply, **before any tool call**, is:

1. **Grade:** one line: `Rung N → N+1` plus the 1–3 rubric items that are missing.
2. **Upgraded prompt:** the prompt rewritten at the next rung, as a quote block, with
   Claude's proposed defaults filled in and marked *(proposed)*.
3. **One question batch** (AskUserQuestion) for what only Giga can decide: thresholds,
   baseline, boundary, environment. Put the proposed default first as "(Recommended)".
   Never ask what the repo or docs can answer.
4. **Run the upgraded prompt** once confirmed, then quietly loop to done (habit
   `working-style-interview-then-autonomous-loop`). The gate *is* that one interview,
   not an extra round.

Skip the gate, and just say `rung N ✓` in one line, when the prompt already meets
the next rung. Skip it entirely for questions, quick follow-ups inside a running task,
or when Giga writes `skip gate`.

Track progress: `/retro` notes the rung of the session's first work prompt in the
scorecard row ("rung 1→2 after gate"). The focus in `brain/coaching.md` retires
when 3 sessions in a row open at rung 3 or higher with no gate needed.
