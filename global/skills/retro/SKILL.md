---
name: retro
description: End-of-session learning — while the whole session is still in context, extract what's reusable, apply it straight to the gigabrain brain (habits, patterns, coaching focus, scorecard, journal, prompt log), secret-scan, commit and push gigabrain, and give Giga one concrete thing to do better next time. Use when Giga says /retro, "wrap up", "what did we learn", "save session knowledge", or signs off ("that's it for today", "done for today", "good session") — even in a fresh session, since sessions.jsonl lists the ones it missed.
---

# Retro: learn from this session, update the brain, push

Giga asked for the brain to get smarter after every session, automatically,
without collecting junk. This skill is the learner. It runs in-session, so it
has the full context, and Giga is present when it pushes.

`G` = `~/projects/gigabrain`.

## 1. Gather (silently)

- This session: Giga's prompts, corrections, frictions, what worked.
- `G/inbox/*.md`: older candidates (from earlier retros); fold them in too.
- `G/inbox/signals.jsonl`: coach-hook flags per prompt (`no_done`,
  `debug_no_hypothesis`, `multi_task`, `research`, `big_spec`, `vague`).
  Count only the rows since the last row in `me/scorecard.md`'s session table.
  `bin/signals-report.py` gives the monthly rates. Quote the current month
  vs the baseline when a coaching.md bullet is added or retired.
- `G/inbox/sessions.jsonl` (hook `session-log.py`, PreCompact + SessionEnd):
  sessions since the last retro commit (`git log -1 --format=%cI -- me/journal`).
  For each one with no `/retro` of its own, skim its `transcript` for Giga's
  corrections and failures only (prompts, plus the `is_error` tool results;
  never the full file). Count them in the reply ("caught up on N missed
  sessions"). Skip any whose transcript is gone.

## 2. Apply the bar, then write

Each lesson must be **reusable · evidenced · behaviour-changing · new** (see
CORE.md). Usually 0–3 survive. If none do, still do steps 3–5.

**Prove "new" before writing.** For each candidate run
`grep -ril '<2-3 key terms>' G/brain G/library/checklists` and show the hits. Then
give one verdict per candidate (from ECC's learn-eval gate, which dropped
numeric scores because they misled models):
**Save** (new file) · **Absorb into [[existing]]** (add the new evidence or
symptom as an example under that entry; same root cause = same entry) · **Drop**
(one-off, already covered, or not evidenced). Absorb beats Save whenever the
root cause matches.

**Entry shape** for new habits/patterns: the rule, `**Why:**`, `**How to
apply:**`, and two lines that make it recognisable later:
`**Signal:** <what in a prompt or situation shows this applies>` and
`**Next time:** <the concrete action>`.

| Lesson | Write to |
|---|---|
| how Giga and Claude should work | `brain/habits/<slug>.md` (memory frontmatter); one CORE.md line only if it should shape *every* session |
| reusable technical decision / gotcha | `brain/patterns/<slug>.md` |
| a prompt that went badly or well | `ai-craft/prompt-log.md` (before → after → why) |
| a concept Giga engaged with | `me/concepts.md` (raise a level only on evidence) |
| project-only fact | leave it to that project's auto-memory; not gigabrain |
| a business rule a change broke, nearly broke, or `intent-reviewer` proposed | that project's `<memory dir>/business-invariants.md` (format in skill `intent-review`); client repos too, since it stays local |
| a library skill or reviewer checklist was used | `brain/library-ledger.md` (below) |

**Library evidence** (the ledger is the only place imported knowledge earns
trust). For each `library/` skill invoked, or `library/checklists/` file the
reviewer loaded, in this session: append one dated, generalised line to its
row's evidence (`2026-10-03 · nest api · pagination advice matched the repo`)
and move its confidence: held up **+0.1**; advice wrong or outdated **−0.2**
and append `needs-edit: <what to change>` to the row (the next `/absorb` turns it
into an `edits` rule; retro never touches `library/` or `sources.json`); the
project's convention differed and rightly won **0**, evidence line only. An entry used but not tested by the work
gets no line. Generalise exactly as for brain/ entries. The ledger is in
`brain/`, so it goes in the same `brain-commit.sh` call.

Merge into an existing entry rather than adding a near-duplicate. Keep CORE.md
≤ 120 lines: merge or demote to stay under (`G/bin/kit budget` measures it).

**Handoff (failure-first), whenever work is unfinished or a next session will
continue it.** Write `handoff-<repo-dir-name>.md` (overwrite your own; never another
repo's: newEra's memory dir is shared by several repos) in the project's memory dir (its
`.claude/settings.local.json` `autoMemoryDirectory`; for a client repo, the
local `~/.claude/projects/<slug>/memory/`). The guard hook injects it at the
next session start, **only in the same repo**, so the first line must be the
repo id:

```
repo: <output of `git rev-parse --path-format=absolute --git-common-dir`>
updated: YYYY-MM-DD
## Worked (each with: confirmed by <test/curl/log>)
## Failed — do not retry (each with the exact reason)
## Not tried yet
## Next step (one, concrete)
```

Unproven items go under "Not tried", never "Worked". Keep it ≤ 40 lines. When
the work is finished, delete that handoff file instead. The handoff is project memory:
it is never committed by this retro (client handoffs never leave the machine).

**Never write into brain/:** secrets, personal data, or client internals
(product/service names, schemas, URLs). Generalise ("a barrel import cycle
silently renamed a queue") or drop it.

## 3. Update the coaching loop (this is how it builds up)

- `me/scorecard.md`: append one row to the session table (date, project, the
  signals observed).
- `brain/coaching.md` is what the coach hook injects into *every* prompt. Keep
  it at **≤ 5 bullets**, each one a weakness Giga is currently working on,
  with the evidence. Remove a bullet once Giga has shown the better
  behaviour in ~3 sessions running (say so in the retro, since it's a win), and
  add one when a new weakness repeats. A bullet that stays forever
  means the coaching isn't working; change its wording or approach.
- `me/roadmap.md`: if this session showed a phase's proof, set its Status to
  `done <date>` and move the `**Now:**` line to the next concrete step. No
  proof, no tick. A phase past its due date gets one line in the reply: slip
  it, or cut its scope?
- `me/journal/YYYY-MM-DD.md`: append one line: what Giga learned or decided.

## 4. Commit and push gigabrain (Giga's standing request; gigabrain only)

Commit **exactly the files you wrote in this retro**, nothing else:

```bash
G/bin/brain-commit.sh "brain: <what was learned, ≤ 60 chars>" brain/habits/x.md me/scorecard.md ...
```

The helper refuses paths outside `brain/ me/ ai-craft/`, refuses if anything
else is already staged, and runs the pre-commit scan (secrets + client terms).
It never sweeps in Giga's own uncommitted edits. Exit 1 = blocked: fix the
wording (generalise), never `--no-verify`. Exit 2 = nothing changed. A failed
push isn't fatal; say so. Project repos stay untouched (CORE.md "never commit").

## 5. Coach Giga (the reply, ≤ 12 lines)

1. **Learned:** one line per thing that went into the brain (path).
2. **Went well:** one concrete thing Giga did that helped. Keep doing it.
3. **One upgrade:** rewrite one of Giga's *actual* prompts from this session.
4. **Feature you could have used:** the exact moment a subagent, worktree,
   plan mode, hook or `claude -p` would have paid off.
5. The commit hash, and whether it was pushed.
