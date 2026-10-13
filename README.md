# gigabrain

Giga's shared brain with Claude, and the record of how working with AI gets
better over time. It does three jobs:

1. **Makes every Claude session smarter**, in any project, by loading a short,
   curated set of habits (`brain/CORE.md`) everywhere.
2. **Learns from every session** without collecting junk: sessions produce
   *candidates*, and only the ones that clear a strict bar become brain.
3. **Measures growth**: an AI-usage scorecard, a concept ladder, a journal.

## How it fits together

| When | What runs | What it does |
|---|---|---|
| Every prompt | coach hook (`global/hooks/coach.py`, ~30 ms, no model call) | adds cues and the `brain/coaching.md` focus, so Claude steers: done-criteria, debug protocol, agents, worktrees, plan mode, one 💡 tip |
| Every session | `brain/CORE.md` (loaded via `~/.claude/CLAUDE.md`), the project's CLAUDE.md, memory | the always-on habits |
| Every tool call | guard hook (`global/hooks/guard.py`) | blocks `--no-verify`, asks before destructive commands, protects config, hints at compacting. At session start it shows the handoff note |
| End of session: `/retro` | lessons go into `brain/`, coaching, scorecard, journal, prompt log | then the pre-commit scan (secrets and client terms), then commit and push gigabrain |
| Weekly: `/curate` | prune, merge, re-check old entries | plus `kit` doctor, audit and budget |
| Outside knowledge: `/absorb` | pulls vetted skills from upstream into `library/` | the ledger (`brain/library-ledger.md`) promotes what real sessions prove |

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
| `tracks/` | technical curriculum: messaging, scaling, Kubernetes, AWS, AI engineering |
| `labs.md` | every connected project and where its memory lives |
| `library/` | imported skills and review checklists, pinned to an upstream commit (`/absorb`) |
| `kit/` | per-project layer: `stacks.json`, project registry. **Start here: `kit/README.md`** |
| `bin/` | `install.sh` (wire into ~/.claude), `kit` (detect/apply/doctor/audit/budget), absorb + check scripts, `eval-skills` (trigger evals for `global/skills`) |
| `.githooks/` | secret scan on commit (prints masked findings only) |

## Commands you'll use

| Command | When |
|---|---|
| `/retro` | end of any meaningful session (2 min) |
| `/curate` | weekly, or when the session-start notice says 5 or more candidates are waiting |
| `/tutor` | lab work where *you* should write the core |
| `/debug-protocol` | anything broken |
| `/onboard-project` | first session in a repo without a CLAUDE.md |
| `/build-loop` | "build this until it works, don't keep asking me" |
| `/absorb` | pull improvements from an upstream source (ECC) into `library/` |
| `kit apply <repo>` · `kit doctor --all` | wire any project; check every project's health |
| agents: `reviewer`, `intent-reviewer`, `researcher`, `verifier` | in order: review with stack checklists; check a diff against the business requirement (also skill `/intent-review`); research with citations; prove a fix by rerunning the reproduction |

## Setup (also on a new machine)

```bash
git clone <private-url> ~/projects/gigabrain
~/projects/gigabrain/bin/install.sh
```
