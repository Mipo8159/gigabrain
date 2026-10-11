# kit: gigaforge for every project

gigaforge has two halves. The **brain** (habits, patterns, coaching) and the
**library** (imported skills and checklists) are global. The **kit** applies
them to each repo, adjusts per project, and keeps every project healthy as
gigaforge changes. Its architecture comes from ECC's install system (manifests,
an ownership record, doctor/repair, ask rules), cut down to one Python file.

## Daily use

```bash
kit detect .                      # what stacks/commands/risky scripts are here (read-only)
kit apply . --kind own --dry-run  # what it would write
kit apply .                       # do it; then /onboard-project fills CLAUDE.md
kit doctor --all                  # install + every project: drift, TODO scaffolds, memory
kit status                        # one line per project
kit apply --all                   # after pulling gigaforge changes
kit audit --all                   # Claude config security (masked output)
kit budget                        # always-on context cost; CORE.md ≤ 120 lines
kit remove .                      # undo exactly what apply recorded
```

`--kind client` keeps memory local, and adds the scaffold to `.git/info/exclude`
so it can't be committed by accident.

## What apply writes (and records in `.claude/gigaforge.state.json`)

| Where | What | Removed by `kit remove` |
|---|---|---|
| `.claude/settings.local.json` | ask-first rules for the detected stacks (`kubectl delete`, `docker push`, `DROP TABLE`…) and for each **risky script** found in package.json (`deploy`, `remove`, `revert:*`, `seed:*`…); `autoMemoryDirectory` | only the rules it added; yours stay |
| `CLAUDE.md` | a scaffold with the real commands, stack, library skills and checklists. Only written when none exists | only if still untouched |
| `.git/info/exclude` | the kit's own files (+ scaffold for client repos) | yes |
| `.claude/gigaforge.json` | **your knobs**: `kind`, `memory`, `include_stacks`, `exclude_stacks`, `hooks` | yes |

`ask` rules always prompt, even in auto mode and even with a global `allow: Bash`
(deny > ask > allow; verified against the Claude Code permissions docs 2026-10-03).
They live in the personal `settings.local.json`, never the team's `settings.json`.

## Adjusting a project

Edit `.claude/gigaforge.json`, then `kit apply .`:

```json
{ "kind": "own", "memory": "newEra", "exclude_stacks": ["docker"],
  "include_stacks": ["kafka"], "hooks": "strict" }
```

New stacks go in `kit/stacks.json` (indicators → skills, checklists, ask rules).
Every name it references must exist in `library/` (checked by `kit doctor`).

## Guard hooks (`global/hooks/guard.py`, one process per event, ~35 ms; `kit selftest` pins 140+ command cases)

| Check | Profiles | Behaviour |
|---|---|---|
| no-verify | minimal standard strict | hard deny: `--no-verify`, `commit -n`, `-c core.hooksPath=`, `HUSKY=0` |
| destructive | minimal standard strict | **asks you** (a real permission prompt; the model can't approve itself): `rm -r` outside relative build/cache dirs, `reset --hard`, force/delete push, SQL drop/truncate/unbounded delete via a DB client, prisma/typeorm/knex/alembic/Django resets, `kubectl delete`, `terraform`/`tofu`/`pulumi destroy`, `aws … delete-*`, docker prune/`down -v`, redis flush… Commands are analysed per segment, inside `bash -c`/`ssh`/`$(…)`, with `git -C`/`kubectl -n`/`aws --profile` skipped; unparseable or >64 KB commands ask too (fail closed) |
| config-protect | standard strict | deny once: editing existing lint/format/hook config (eslint, prettier, biome, ruff, golangci, husky, .githooks…) |
| compact-hint | standard strict | at ≥160k context: suggest /compact at the next phase boundary |
| handoff | standard strict | SessionStart: inject this repo's `handoff.md` (from /retro), ≤ 4k chars, marked historical |
| stop-typecheck | strict | after each reply: `tsc --noEmit` / `go vet` / `ruff` on files edited this turn; errors go back to Claude |

Profile: `GIGAFORGE_HOOK_PROFILE`, else the project's `gigaforge.json` `hooks`, else
`standard`. Switch one off: `GIGAFORGE_DISABLED_HOOKS=compact-hint,destructive`.

## What was deliberately not taken from ECC

Per-tool-call observation and auto-generated skills (memory-poisoning risk;
`/retro` with the full session is the better signal), 15 harness adapters, the
component-alias layer, LLM summaries in hooks, telemetry hooks, MCP health
probing, and the always-loaded rule packs (folded into review checklists).
