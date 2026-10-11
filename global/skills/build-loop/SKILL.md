---
name: build-loop
description: Take a feature or change request from a loose description all the way to verified-working, in one pass. Interview the user hard up front, write mechanically-checkable acceptance criteria, get one approval, then iterate build/test/debug autonomously without further interruption until every criterion verifies green. Use whenever the user describes something they want built, fixed, or changed and expects it finished rather than discussed — especially when they say "loop", "until it works", "don't keep asking me", or "just get it done".
---

# Build loop

One approval, then autonomous work. The user's complaint that produced this
skill was clicking "yes" thirty times per feature. Every rule below exists to
push all the interaction to the front and keep the middle silent.

**This is not `/loop`.** `/loop` is a scheduler that re-runs a prompt on a
timer. This is a single continuous session that iterates internally until the
criteria pass. Do not schedule wakeups from here.

## Phase 1 — Interview

Nothing gets written before the criteria exist. Not a scaffold, not a "quick
start" — the interview is the work at this stage.

**Answer everything you can yourself first.** Never spend a question on what
the codebase can tell you: existing patterns, current schema, what the test
runner is, which package manager, whether a thing already exists. Read and
grep first. A question you could have answered by looking is friction, which
is the exact thing this skill exists to remove.

Then ask, in batches of up to four via `AskUserQuestion`, and keep going in
further rounds until nothing material is unresolved. Being asked eight good
questions once is what the user wants; being asked one question eight times is
not. The bar for a question: **different answers produce different work.**

Probe these, and drop any that the request already settles:

| Area | What you're trying to pin down |
|---|---|
| Done-ness | What observable thing proves this works? This is the most important one — ask it every time. |
| Scope edge | What is explicitly *not* in this change? Non-goals prevent the loop from wandering. |
| Shape | Data/API/schema shape, naming, where it lives in the tree |
| Failure behavior | What happens on bad input, missing service, timeout — silently skip, throw, retry? |
| Blast radius | Is anything destructive, outward-facing, or irreversible in here? Get that authorized now, not mid-loop. |
| Existing work | Reuse an existing pattern, or is this a deliberate departure? |

If an answer would change the design significantly, say so and offer a
recommendation with the question — you are not neutral, you have read the code.

## Phase 2 — The contract

Write `.claude/loop/<slug>.md` in the project. It is the loop's memory: it must
survive compaction, a crash, or a fresh session picking the work up cold.

```markdown
# <goal in one line>

## Acceptance criteria
- [ ] 1. <observable behavior>
      verify: <exact command>
      expect: <what its output must show>
- [ ] 2. ...

## Non-goals
- <thing deliberately excluded>

## Assumptions
- <what you assumed where the user did not specify>

## Log
- <iteration notes; append, never rewrite>
```

**Every criterion needs a command.** If you cannot write one, the criterion is
not yet a criterion — either turn it into something checkable or move it to
non-goals and say so. "Code is clean" is not a criterion. "`npm run lint` exits
0" is.

Prefer a criterion that exercises the real thing over one that asserts the
shape of the code. A test that spawns the process and reads its output beats a
test that checks a function was defined.

Show the contract, get one approval. **That is the last interruption.**

## Phase 3 — The loop

Iterate: implement → run the verify command → read the actual output → fix →
repeat. Until every box is checked.

**Green means the command ran and you read its output in this session.** Not
"the edit looked right", not "this should now pass". Inference is not
evidence. Check a box only after seeing it pass.

Rules that keep the loop honest:

- **Never weaken the check to make it pass.** Loosening an assertion, adding a
  skip, widening a type to `any`, catching and swallowing — if a criterion is
  genuinely wrong, say so in the Log and raise it; do not quietly redefine
  success. This is the one failure mode that makes the whole workflow
  worthless.
- **Update the contract file as you go.** Check boxes, append to the Log. State
  in your head does not survive compaction; state on disk does.
- **Three identical failures means stop guessing.** Change method: add
  instrumentation, bisect the change, read the actual library source, print the
  real value instead of assuming it. A fourth blind attempt is wasted.
- **Re-run everything before declaring done**, not just the criterion you last
  touched. Fixing #4 breaks #2 more often than not.
- **Work the whole list.** A blocked criterion does not license stopping —
  finish every other one, then report precisely what is blocked and why.

Surface to the user mid-loop **only** for:
- a destructive or outward-facing action not already authorized in Phase 1
  (pushing, deploying, deleting data, anything that leaves the machine)
- a criterion that turns out to be impossible or self-contradictory
- an external blocker you cannot resolve — missing credential, service that
  needs an interactive login

Everything else — a failing test, a confusing error, a design micro-decision, a
dependency to install — you handle. That is the deal.

## Phase 4 — Report

Run the full verify set once more, cleanly, then report:

- each criterion, its command, and the evidence it passed
- anything left red or skipped, stated plainly — never round up to "done"
- assumptions you made that the user should sanity-check

Keep it short. The user has not been watching; they want the delta and the
proof, not a narration of the iterations.
