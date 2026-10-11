---
name: gigabrain-is-the-brain
description: Giga's cross-project brain repo at sweeft/gigabrain (built 2026-10-01) — brain/CORE.md loads in every session via ~/.claude/CLAUDE.md; this newEra folder now holds only newEra project facts.
metadata:
  type: project
---

`/home/mip/Desktop/workdir/sweeft/gigabrain` (private repo
`git@github.com:Mipo8159/gigabrain.git`, branch `master`, first pushed
2026-10-01 as `732a0f5`; Giga commits and pushes) is the centre of the setup:

- `brain/CORE.md` is the always-on habits file, imported by `~/.claude/CLAUDE.md`.
  The six cross-project habits that used to live here (interview-then-loop,
  argue back, never commit, don't strip architecture, mask secrets, wide-open
  permissions) moved to `brain/habits/`.
- This folder physically lives at `gigabrain/memory/newEra`;
  `~/.claude/memory/newEra` is a symlink to it.
- Skills/agents/hooks are edited under `gigabrain/global/` and symlinked into
  `~/.claude` by `gigabrain/bin/install.sh`, which Giga runs (auto-mode blocks
  Claude from changing its own config/memory index, correctly).
- Growth loop (2026-10-02): a UserPromptSubmit coach hook (`global/hooks/coach.py`)
  injects cues + `brain/coaching.md` into every prompt; `/retro` updates the brain
  and coaching focus, then commits and pushes gigabrain (Giga's standing request,
  `brain/ me/ ai-craft/` only). The after-exit background learner (SessionEnd →
  headless claude → auto-push) was blocked twice by auto mode, the second time
  even with Giga's explicit request. Don't retry it; it's Giga's to enable.
- clasico memory stays local (client-confidential), never in gigabrain.

**Why:** Giga wants the brain to improve after every session from any project,
without collecting garbage, and to measure their AI-usage growth (baseline
≈20–25%, `gigabrain/me/scorecard.md`).

**How to apply:** global lessons go to gigabrain via `/retro` + `/curate`,
not into this folder. See [[tracker-distributed-systems-lab]] (issue-flow was deleted 2026-10-06),
[[session-setup-works-from-either-folder]].
