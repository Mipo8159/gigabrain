---
name: curate
description: Promote or discard the harvest candidates waiting in gigaforge/inbox/ — move the few that earn it into brain/ (habits, patterns, CORE.md) or a project's memory, update Giga's scorecard, concepts and journal, and prune stale brain entries. Use when Giga says /curate, "curate the brain", "process the inbox", or when a session-start note says candidates are waiting.
---

# Curate the brain

The inbox is untrusted. The brain is what every future session reads first, so
every line in it costs attention in every project. **Your job is mostly to say
no.** A good run promotes 0–3 things and deletes the rest.

Repo: `/home/mip/Desktop/workdir/sweeft/gigaforge` (call it `G`).

## 1. Load

- Read `G/brain/CORE.md`, list `G/brain/habits/` and `G/brain/patterns/`
  (names + descriptions only; open a file only when a candidate overlaps it).
- Read every `G/inbox/*.md` (skip `.harvest.log`).

## 2. Judge each candidate

Apply the four-part bar from CORE.md. All four must hold:
**reusable · evidenced · changes behaviour · new**.

Then route it:

| Candidate | Goes to |
|---|---|
| `habit`, global | `brain/habits/<slug>.md`, plus one line in CORE.md *only if* it should shape every session |
| `pattern`, global | `brain/patterns/<slug>.md` (no CORE line unless it's universal) |
| `prompt-lesson` | append to `ai-craft/prompt-log.md` (before → after → why) |
| `concept` | update the row in `me/concepts.md` (only ever raise a level with evidence) |
| `project-fact` | that project's memory dir (its `.claude/settings.local.json` `autoMemoryDirectory`, else `~/.claude/projects/<slug>/memory/`), with its MEMORY.md line. **Client projects (clasico) stay local, never in `G`.** |
| anything else | delete |

If it overlaps an existing entry, **merge into that entry** (sharpen the rule,
add the new evidence) instead of creating a sibling.

Entry format = memory format: frontmatter `name` / `description` /
`metadata.type`, then the rule, then `**Why:**` and `**How to apply:**`, then
`[[links]]`.

## 3. Scorecard and journal

- From each candidate file's "AI-usage signals", add a dated row to the tally
  table in `me/scorecard.md`. Don't re-score the headline numbers; that is the
  monthly review with Giga.
- Append each "Journal line" to `me/journal/YYYY-MM-DD.md` (one file per day).

## 4. Prune (every run, not optional)

- CORE.md over ~120 lines → merge or demote the weakest lines to their entry files.
- Any brain entry contradicted by newer evidence → fix it or delete it, and say so.
- Entries untouched for 90+ days with no recent evidence → list them for Giga
  as "still true?". Don't delete these silently.
- **Library** (`brain/library-ledger.md`, rules in `library/README.md`):
  - confidence ≥ 0.7 with evidence from 2+ projects → promote: distil the rule
    the evidence actually proved into `brain/patterns/<slug>.md` (not the whole
    chapter), link it from the ledger row. The four-part bar still applies.
  - confidence < 0.3, or no evidence 90+ days after the row's `Added`
    date → put it under "Ask Giga" (drop it from `sources.json`, re-run
    `bin/absorb-adapt.py`, delete its folder and ledger row on a yes).
  - `bin/check-library.py --drift` (after `git -C <local> fetch` for each
    source): if upstream commits touch absorbed paths, report "run
    `/absorb <source> --update`". Rows marked `needs-edit` also go in that
    line. Don't absorb from inside /curate.

## 5. Clean up and hand over

- Delete processed inbox files (they are gitignored and have served their purpose).
- **Pruning is soft.** Move a pruned brain entry to `G/brain/_attic/YYYY-MM-DD/`
  (not `rm`) and append one line to `G/me/curate-log.md`:
  `YYYY-MM-DD · moved <path> → _attic/… · why · undo: git mv <back>`. At most
  ~20 prune candidates per run; each is listed separately, never "all of the above".
- Health, deterministic (quote the summary lines, don't re-score them):
  `G/bin/kit doctor --all` (install + every project), `G/bin/kit audit --all`
  (config security; a new critical/high goes under "Ask Giga"), and
  `G/bin/kit budget` (always-on context; CORE.md over 120 lines is a FAIL to fix now).
- Run `G/.githooks/pre-commit` (secret scan; it prints masked output only).
- **Don't commit.** Report in this shape:

```
Promoted (n): <title> → <path>   (one line each, with the bar it cleared)
Merged (n):   <title> → <existing entry>
Discarded (n): <one-line reason per kind, not per item>
Pruned:       <what and why>
Library:      <promoted / to retire / drift: source n commits>
Health:       doctor <e/w> · audit <unaccepted crit/high> · budget <always-on tokens, CORE lines>
Ask Giga:     <stale entries needing a yes/no>
```
