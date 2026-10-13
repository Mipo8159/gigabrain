# gigabrain: working inside the brain repo

This repo is Giga's shared brain with Claude: curated habits, project memories,
the skills/agents/hooks installed globally, and the record of how Giga's AI
skill grows. `brain/CORE.md` is already loaded (via `~/.claude/CLAUDE.md`).

## Layout and who writes what

| Path | What | Written by |
|---|---|---|
| `brain/CORE.md` | always-on rules, ≤ ~120 lines | `/curate` only |
| `brain/habits/` | how we work together (one fact per file, memory frontmatter) | `/curate` |
| `brain/patterns/` | reusable technical decisions (library picks, gotchas, designs) | `/curate` |
| `library/` | imported skills + reviewer checklists, pinned to upstream (see `library/README.md`) | `/absorb` + `bin/absorb-adapt.py` |
| `brain/library-ledger.md` | confidence + evidence per library entry | `/retro`, `/curate` |
| `kit/` | `stacks.json` (each stack's skills, checklists and ask rules), the `projects.json` registry, `audit-accept.json` | Claude and Giga; the registry by `bin/kit` |
| `memory/<project>/` | project facts; a project's `autoMemoryDirectory` points here | auto-memory |
| `inbox/` | **gitignored**, untrusted: candidate lessons and coach signals | coach hook (signals), `/retro` |
| `me/roadmap.md` | phases that close gaps, plus the `Now:` milestone the coach hook adds to prompts | `/retro` (moves `Now:`) and Giga |
| `me/scorecard.md` | AI-usage scores, re-scored monthly | `/curate` + Giga |
| `me/concepts.md` | each topic's level: seen, explain, build or teach | `/curate` and Giga |
| `me/journal/` | one file per day, 3 lines per session | `/curate` |
| `ai-craft/` | Track 0: drills + prompt log | Giga + Claude |
| `global/` | installed into `~/.claude` by `bin/install.sh` (symlinks) | edit here, never in ~/.claude |
| `evals/` | agent evals with fixtures (`bin/eval-intent` for `intent-reviewer`); rerun after editing that agent | Claude |

## Rules for this repo

- **Never commit** (see CORE). Hand over a summary instead.
- Before handover, run `.githooks/pre-commit` manually; it is the secret scan.
- To change a skill, agent or hook, edit it under `global/`. The symlinks make
  it live immediately. Say which sessions need a restart (hooks and CLAUDE.md load at
  session start).
- `brain/` entries use the same frontmatter as memory files
  (`name`, `description`, `metadata.type`) and link with `[[name]]`.
- Never hand-edit `library/skills/`: add an `edits` rule to
  `library/sources.json` and re-run `bin/absorb-adapt.py`. `bin/check-library.py`
  must pass before handover.
- Changing `bin/kit*`, `global/hooks/guard.py`, `kit/stacks.json` or
  `bin/install.sh`: `bin/kit selftest` must pass (temp dirs only, ~2 s). A fixed
  bug gets a selftest case with a dated comment.
- Pruning counts as progress too. A smaller CORE.md that says the same thing
  is a better one.
