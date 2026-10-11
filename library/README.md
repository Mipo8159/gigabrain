# library/: imported knowledge, not yet earned

`brain/` holds what Giga and Claude learned the hard way: corrections,
incidents, verified results. `library/` holds what we **read**: skills and
checklists absorbed from outside sources (ECC first), adapted to gigaforge and
pinned to an upstream commit. A library entry is a textbook chapter. It only
becomes knowledge once a real session shows it working.

| Path | What | Written by |
|---|---|---|
| `sources.json` | each source: repo, local clone, licence, pinned SHA, item map, declarative edits, skip reasons | `/absorb` |
| `skills/<name>/SKILL.md` | adapted skills, installed globally by `bin/install.sh` | `bin/absorb-adapt.py` only |
| `checklists/<lang>.md` | review checklists the `reviewer` agent loads per diff | `/absorb` (hand-written synthesis) |
| `NOTICE.md` | upstream licences and credits (MIT requires them) | `/absorb` |
| `../brain/library-ledger.md` | confidence + dated evidence per entry | `/retro`, `/curate` |

## Rules

- **Never hand-edit `skills/`.** Every change is an `edits` rule in
  `sources.json` (`drop_sections`, `replace`), so `bin/absorb-adapt.py <src>`
  reproduces the copy at any SHA and `/absorb --update` loses nothing.
- **Earned evidence lives in `brain/library-ledger.md`, not in these files.**
  That keeps the copies pure (clean upstream diffs) and lets `/retro` commit
  evidence through `bin/brain-commit.sh` without widening its allow-list.
- **Project skills and CLAUDE.md win.** A library skill is a general default.
  When a project's own convention disagrees, follow the project, and record the
  disagreement as ledger evidence.
- **Licences travel with the content.** Keep upstream credit lines; add each new
  source to `NOTICE.md`.
- `bin/check-library.py` must pass before handover (it also runs from `/absorb`).

## Confidence (borrowed from ECC's instinct model)

Every entry starts at **0.4**: plausible, unproven. `/retro` moves it on evidence:

| Event in a real session | Change |
|---|---|
| the entry was used and its advice held up | +0.1 |
| it was used and its advice was wrong or outdated | −0.2; the row is marked `needs-edit` for the next `/absorb` |
| the project's own convention differed (the project rightly won) | 0, evidence line only |

A project override is not a defect in the entry: CLAUDE.md and neighbour code
are supposed to win. Only advice that was actually wrong costs confidence.

- **≥ 0.7 and evidence from 2+ projects** → promotion candidate: `/curate`
  distils the *earned* rule (not the whole chapter) into `brain/patterns/`.
- **< 0.3**, or no evidence 90 days after the row's `Added` date → `/curate`
  asks Giga whether to drop it. `Added` is per row and `/absorb --update` never
  resets it, so a refreshed source doesn't keep unused entries alive forever.
- Only `/absorb` writes `library/` and `sources.json`. `/retro` writes evidence
  to the ledger and marks `needs-edit`; it never edits `sources.json` (its commit
  helper can't commit `library/`, and a half-applied rule fails the check).
