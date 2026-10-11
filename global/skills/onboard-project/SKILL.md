---
name: onboard-project
description: Bring a repo into Giga's gigaforge setup — run `kit detect`/`kit apply` (stacks, ask-first rules, memory, CLAUDE.md scaffold), then fill the CLAUDE.md (commands, conventions, done-definition, gotchas) and register it in gigaforge/labs.md. Use when Giga says /onboard-project, "set this project up", "write a CLAUDE.md here", or starts working in a repo that has no CLAUDE.md.
---

# Onboard a project

Every prompt where Giga re-explains a convention ("leave lessonCount
everywhere…") is a CLAUDE.md line that didn't exist yet. This skill writes it once.

## 1. Interview (one batch, per CORE)

Ask together: Is this a client repo (confidential) or Giga's own? Learning lab
or production work? Anything Claude must never touch (prod DBs, running
services, branches)? Shared memory with sibling repos, or its own?

## 1b. Detect and apply the kit (deterministic, before any prose)

`G=/home/mip/Desktop/workdir/sweeft/gigaforge`. Run `$G/bin/kit detect <repo>` and
show its evidence lines: stacks, the real commands from package.json/Makefile/
pyproject, and the **risky scripts** (deploy/remove/revert/seed…). Then
`$G/bin/kit apply <repo> --kind <own|lab|client> --dry-run`, then the real apply
once Giga has OK'd the interview answers. It writes, and records for `kit remove`:
- ask-first permission rules for the stack and for each risky script, in
  `.claude/settings.local.json` (personal, never the team's settings.json);
- `autoMemoryDirectory` (own/lab → `gigaforge/memory/<name>`; client → local);
- a `CLAUDE.md` scaffold **only if none exists**, plus `.git/info/exclude` lines;
- `.claude/gigaforge.json`, the per-project knobs: `exclude_stacks`,
  `include_stacks`, `hooks` (minimal/standard/strict guard profile). Edit and
  re-run `kit apply` to change them.
For a workspace (non-git root with several repos), apply each child repo; the
root CLAUDE.md is written by hand (below).

## 2. Explore (delegate the sweep)

Use an Explore subagent to collect: build/test/lint/run commands, folder
layout, framework versions, DI/ORM/migration conventions, naming patterns,
how config/env is loaded. Read 2–3 representative files yourself to confirm
the conventions are real.

## 3. Fill `<repo>/CLAUDE.md` (lean, ≤ ~80 lines; replace every scaffold TODO)

Sections: **What this is** (2 lines) · **Commands** (exact, copy-pasteable) ·
**Conventions** (only the ones a newcomer would get wrong) · **Done means**
(the proof expected for a change here: test command, migration run, curl) ·
**Never** (destructive or off-limits actions) · **Gotchas** (seed it from the
project's existing memory files if any).

Don't restate CORE.md; it's already loaded globally.

## 4. Memory (already wired by `kit apply`)

Own/lab repos share `gigaforge/memory/<name>` (pass `--memory newEra` to join the
newEra pool). **Client repos keep memory local**: `kit` never points them into
gigaforge and `kit doctor` errors if something does. `bin/link-project.sh`
still exists for one-off relinks.

## Multi-repo workspaces (e.g. clasico = core/ + admin/ under a non-git root)

- **Root `CLAUDE.md`** (outside any git repo, so it stays local): what each repo
  is, how they talk (API base URL, auth, shared DTO/enum names), which repo
  a typical change touches first, and the *cross-repo* done-definition
  (backend proven by curl/migration, then UI proven against it).
- **Per-repo `CLAUDE.md`**: commands and conventions for that repo only. Nested
  files load when Claude works in that folder, so the root one stays short.
  For a client repo, ask whether it's committed for the team or kept local
  (add it to `.git/info/exclude`).
- **One memory for the whole workspace.** Point every sub-repo's
  `settings.local.json` `autoMemoryDirectory` at the root's memory dir, so
  starting from root, core/ or admin/ reads the same notes.
- **Hooks go in each repo's `.claude/settings.json`**. That's where its formatter
  and its dangerous commands live. Turn any memory that says "X is dangerous"
  (e.g. a migration that hits prod) into a PreToolUse hook that blocks it.
- **Where to start sessions:** root for features spanning both repos; inside a
  repo for single-repo work and for worktrees (`claude --worktree` needs git).

## 5. Register

Add a row to `gigaforge/labs.md`: name, path, kind (lab / own product /
client), what it's for, memory location.

Finish with `$G/bin/kit doctor <repo>` and `$G/bin/kit audit <repo>`: no
errors, and no "untouched scaffold"/TODO warnings. Hand over without committing.
Tell Giga which file to review first.
