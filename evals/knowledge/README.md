# Knowledge evals: proving a skill makes Claude write correct code

**In short:** each domain skill in `global/skills/` (Kafka, Postgres, NestJS…)
has to earn every line. A line stays only if a hidden test shows that Claude
fails without it and passes with it.

## Why this exists

A skill full of textbook advice costs context in every session and teaches the
model nothing it didn't already know. The useful part is the small set of
mistakes a strong model still makes. This folder finds those mistakes with
real code and real tests, then keeps the skills down to what fixes them.

## How one case works

```
evals/knowledge/<domain>/<case>/
  task.md     a normal ticket. It never names the trap.
  fixture/    the starting project.
  hidden/     tests Claude never sees during the run.
  solution/   a reference fix. Used only by --verify-fixtures.
  setup.sh    optional: prepares the database etc.
```

1. The runner copies `fixture/` into a fresh temp git repo.
2. Headless Claude gets `task.md` and works on it. Edits are allowed; Bash is
   limited to node/npm/tsc and read-only commands.
3. When Claude stops, the runner copies `hidden/` in and runs the check
   (default `node --test 'hidden/**/*.test.*'`). Exit code 0 is a pass.
   Nothing else is graded: no LLM judge, no keyword matching.

## The two arms

| Arm | What Claude sees |
|---|---|
| `base` | Vanilla: no CLAUDE.md, no brain, no gigabrain skills (`--setting-sources project`). |
| `skill` | The same, plus the domain skill via `--plugin-dir`. It has to trigger on its own description, as in real use. |

## How to read results

| base | skill | Meaning | Action |
|---|---|---|---|
| passes | passes | Claude already knows this. | Retire or harden the case. Keep it out of the skill. |
| fails | passes | The skill teaches something real. | Keep the line. |
| fails | fails | The skill doesn't help yet. | Rewrite the line, or check the skill triggered. |
| passes | fails | The skill hurts. | Remove or fix the line now. |

## Rules for writing cases

- **The task reads like a real ticket.** Naming the trap ("watch out for
  backpressure") tests reading, not knowledge.
- **The hidden test fails on the plausible wrong answer** and passes on any
  correct one. `--verify-fixtures` must show `bare: fail, solution: pass`.
- **Audit a failure before trusting it.** Read the failing assertion and the ticket
  together. If a defensible reading of the ticket leads to the "wrong" answer, the
  case is unfair: fix the wording or drop the assertion. (2026-10-12: an idempotency
  case failed 0/2 because Claude replayed a stored 502, which is Stripe's documented
  behaviour.)
- **Skill lines are general rules, never a case's answer.** To catch
  overfitting, each domain keeps a few *held-out* cases (tag `heldout: true`
  in task.md). Those are never shown to whoever edits the skill. A skill that
  only fixes the cases it was written from is learning the test, not the domain.

## Commands

```bash
bin/eval-knowledge --list
bin/eval-knowledge --verify-fixtures --domain kafka   # no model calls
bin/eval-knowledge --domain kafka --arms base --runs 2 # find the gaps
bin/eval-knowledge --domain kafka --runs 3             # base vs skill
bin/eval-knowledge --domain kafka --arms skill --skill-dir /tmp/draft-skill
```

Results go to `results/<timestamp>/` (gitignored): `summary.md`, `results.jsonl`,
and for every run its `diff.patch`, `transcript.jsonl`, `final.md`, `check.log`.
Services: Postgres 17 runs in Docker (`gb-knowledge-pg`, port 55432, one database
per run); Redis starts locally on a random port per run. Shared npm dependencies
live in `_deps/<set>/package.json`, are installed once into
`~/.cache/gigabrain/knowledge-deps/`, and are symlinked into each run.

Each `<domain>/BRIEF.md` is the researched list of traps (with sources), plus a
short "mental model" for humans. `<domain>/NOTES.md` records what the runs taught:
what vanilla Claude already knows, and which skill lines turned failures green.
