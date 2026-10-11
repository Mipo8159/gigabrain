---
name: absorb
description: Import or refresh outside knowledge (skills, agents, checklists) from an upstream source such as the ECC repo into gigaforge/library — triage against Giga's stack, adapt with provenance, pin the upstream commit, and later diff upstream changes since the pin. Use when Giga says /absorb, "absorb X", "pull the good parts of <repo>", "update the library", "what changed in ECC", or when /curate reports library drift.
---

# Absorb: learn from outside sources, not only from our own sessions

`/retro` grows the brain from Giga's own work. `/absorb` grows it from other
people's best work, so the brain keeps getting ahead instead of staying at
the level of whatever we happened to hit this week. What is read lands in
`library/`; it only counts as earned once `brain/library-ledger.md` holds
evidence for it. Read `G/library/README.md` first; it is the contract.

`G` = `/home/mip/Desktop/workdir/sweeft/gigaforge`.

Modes: `/absorb <source>` (first import or add items), `/absorb <source> --update`
(refresh to upstream HEAD), `/absorb <git-url>` (new source).

## 1. Stack filter (what is worth reading at all)

Giga's stack: Node/TypeScript (Nest), React, Python (FastAPI), Go, Postgres,
Redis, Docker, Kubernetes, AWS (ECS, Lambda, DynamoDB, EventBridge, MSK via
the `aws-core` plugin), Kafka and other message brokers. Plus cross-cutting:
review, testing, verification, security, debugging, research, architecture.
Skip anything outside it (other languages, marketing, trading, the source's
own tooling) and anything an installed plugin already covers officially.

## 2. Triage (then one approval)

- **New source:** clone it read-only next to gigaforge
  (`/home/mip/Desktop/workdir/sweeft/<name>`), check the licence (no licence or
  non-permissive → stop and tell Giga), add an entry to `library/sources.json`.
- **`--update`:** `git -C <local> fetch`, then `bin/check-library.py --drift`.
  For each commit touching absorbed paths, read the diff
  (`git -C <local> diff <pin>..origin/<branch> -- <path>`) and classify:
  *take* (a fix or real improvement), *ignore* (upstream tooling or format churn),
  *conflict* (contradicts a brain entry or ledger evidence; the brain wins,
  raise it). Also list new upstream items that pass the stack filter.
- For every candidate item, compare with what exists: `global/skills`,
  `library/skills`, `library/checklists`, installed plugin skills. Overlap → skip
  with a reason in `sources.json` `skipped`, or merge into the existing entry.
- Present **one table**: item · take/skip/merge · why. Get Giga's one OK. Then
  run steps 3–5 without further questions.

## 3. Adapt

- **Skills** are generated, never hand-edited:
  `bin/absorb-adapt.py <source> [--sha <sha>] [skill ...]`. Fix every `WARN` by
  adding a rule to `sources.json` `edits.<skill>` (`drop_sections` for
  upstream-only sections, `replace` for single lines), then re-run. Rename any
  skill whose name collides with ours or a built-in (map `local-name` →
  upstream path in `skills`).
- **Agents** don't get imported as agents. Fold a reviewer-type agent into a
  `library/checklists/<topic>.md` (format: see an existing checklist; 50–120
  lines of things to check in a diff, no persona, no tutorial) and make sure
  `global/agents/reviewer.md` maps it. Other agents: propose them as their own
  item, with the overlap argument.
- **Rules / always-loaded files** are never imported as-is. They cost context in
  every session; fold their checkable points into a checklist.
- **Hooks** are proposed, never installed: show the hook, its per-call cost and
  what it would change, and let Giga decide (changes to `~/.claude` need the
  human installer, `bin/install.sh`).
- Keep every upstream credit line; add the source's licence to `library/NOTICE.md`.
- Turn every ledger `needs-edit: …` note into an `edits` rule (or a
  checklist fix), then clear the note.
- New entries get a ledger row in `brain/library-ledger.md` (`Added` = today,
  confidence 0.4). On `--update`, existing rows keep `Added`, confidence and
  evidence; if an update rewrote an entry's advice, note it in that row's evidence.
- Description edits: when `drop_sections` removes a topic the upstream
  description advertises, add `edits.<skill>.description`, because the
  description is what triggers the skill.

## 4. Pin and verify

- `--update`: set `pinned_sha` and `absorbed` in `sources.json` to what you
  adapted from, then re-run `bin/absorb-adapt.py <source>` so every copy carries
  the new pin.
- `bin/check-library.py` must exit 0 (provenance, no upstream leftovers,
  credits kept, reproducible from `sources.json`, no name collisions, ledger rows).
- `.githooks/pre-commit --all` must be clean.
- New skills need `bin/install.sh` run by Giga, then a session restart. Say so.

## 5. Report (≤ 12 lines, no commit)

```
Source:   <name> <old pin> → <new pin>  (<n> upstream commits, <m> touched us)
Taken:    <item> — <one-line reason>          (one line each)
Skipped:  <count> — <reasons by kind>
Conflicts: <item> vs <brain entry> — what Giga should decide
Verify:   check-library 0 failures · secret scan clean · install.sh needed: yes/no
```
Never commit: `library/` is outside `/retro`'s allow-list on purpose. Giga
reviews and commits imports.
