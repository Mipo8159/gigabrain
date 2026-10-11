# gigaforge

Giga's shared brain with Claude, and the record of how working with AI gets
better over time. It does three jobs:

1. **Makes every Claude session smarter**, in any project, by loading a short,
   curated set of habits (`brain/CORE.md`) everywhere.
2. **Learns from every session** without collecting junk: sessions produce
   *candidates*, and only the ones that clear a strict bar become brain.
3. **Measures growth**: an AI-usage scorecard, a concept ladder, a journal.

## How it fits together

```
 every prompt ──► coach hook (global/hooks/coach.py, ~30 ms, no model call)
                  adds cues + brain/coaching.md focus → Claude steers: done-criteria,
                  debug protocol, agents / worktrees / plan mode, one 💡 tip
 every session ─► reads brain/CORE.md (via ~/.claude/CLAUDE.md) + project CLAUDE.md + memory
 end: /retro ───► applies lessons to brain/ · coaching.md · scorecard · journal · prompt-log
                  ──► pre-commit (secrets + client terms) ──► commit + push gigaforge
 weekly /curate ► prune, merge, re-check stale entries; kit doctor/audit/budget
 every tool call ► guard hook (global/hooks/guard.py): no-verify block, destructive
                  deny-once, config protection, compact hint; SessionStart: handoff
 outside ───────► /absorb pulls vetted upstream skills into library/; the ledger
                  promotes what real sessions prove (brain/library-ledger.md)
```

Coaching builds up because `/retro` rewrites `brain/coaching.md` from evidence:
weaknesses you've fixed drop off, and new repeated ones get added.

## Layout

| Path | Purpose |
|---|---|
| `brain/` | curated cross-project knowledge. `CORE.md` is always loaded |
| `memory/newEra/` | newEra projects' shared auto-memory (`~/.claude/memory/newEra` links here) |
| `global/` | installed into `~/.claude`: `CLAUDE.md`, skills, agents, hooks |
| `me/` | scorecard, concepts, journal: *Giga's* growth |
| `ai-craft/` | Track 0, working with Claude: drills, prompt log |
| `tracks/` | technical curriculum (messaging → scaling → k8s → AWS → AI eng) |
| `labs.md` | every connected project and where its memory lives |
| `library/` | imported skills + review checklists, pinned upstream (`/absorb`) |
| `kit/` | per-project layer: `stacks.json`, project registry. **Start here: `kit/README.md`** |
| `bin/` | `install.sh` (wire into ~/.claude), `kit` (detect/apply/doctor/audit/budget), absorb + check scripts |
| `.githooks/` | secret scan on commit (prints masked findings only) |

## Commands you'll use

| Command | When |
|---|---|
| `/retro` | end of any meaningful session (2 min) |
| `/curate` | weekly, or when the session-start notice says ≥5 candidates wait |
| `/tutor` | lab work where *you* should write the core |
| `/debug-protocol` | anything broken |
| `/onboard-project` | first session in a repo without a CLAUDE.md |
| `/build-loop` | "build this until it works, don't keep asking me" |
| `/absorb` | pull improvements from an upstream source (ECC) into `library/` |
| `kit apply <repo>` · `kit doctor --all` | wire any project; check every project's health |
| agents: `reviewer`, `researcher`, `verifier` | review with stack checklists; cited research; rerun-the-repro proof |

## Setup (also on a new machine)

```bash
git clone <private-url> /home/mip/Desktop/workdir/sweeft/gigaforge
/home/mip/Desktop/workdir/sweeft/gigaforge/bin/install.sh
```
