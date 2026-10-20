---
name: team-claude-md-gets-a-local-sibling
description: "When onboarding a work repo whose team already commits a CLAUDE.md, never edit it: put personal notes in CLAUDE.local.md + .git/info/exclude. Detect 'tracked' with git ls-files, not -f (macOS is case-insensitive: a tracked lowercase claude.md answers to CLAUDE.md). Sibling client repos can share one local memory dir by setting autoMemoryDirectory by hand."
metadata:
  type: feedback
---

**In short:** a team-committed `CLAUDE.md` belongs to the team. Personal workflow
(done-definition, ask-first list, gotchas) goes in `CLAUDE.local.md` next to it,
listed in `.git/info/exclude`, and only says what the team file leaves out.

**Why:** 2026-10-20, onboarding 12 work repos. Five had a tracked team file
(70–570 lines). Editing them would put a permanent diff in `git status` and
leak into real PRs. Two traps showed up:
- `[ -f CLAUDE.md ]` matched a tracked lowercase `claude.md` on macOS, so a
  check said "local scaffold" for a team file. `git ls-files` tells the truth.
- The team files had stale lines (a CI that moved off CircleCI, a non-existent
  `npm run sls`). The local file is where to record the correction until a PR fixes it.

**How to apply:**
1. `git -C <repo> ls-files | grep -i '^claude\.md$'` decides team vs local.
2. Team file → `CLAUDE.local.md` (deltas only) + `echo CLAUDE.local.md >> .git/info/exclude`.
3. A non-git root above sibling repos gets the cross-repo map in its own CLAUDE.md (loads everywhere below it).
4. For shared memory across sibling client repos, set each repo's `autoMemoryDirectory` to one local dir; the kit leaves an existing value alone and the handoff hook filters by the `repo:` line.
5. Prove it: `git status --porcelain` empty in every repo afterwards.

**Signal:** onboarding an employer/team repo; "CLAUDE.md already exists"; several sibling repos.
**Next time:** ask "team file or personal?" in the interview batch, with CLAUDE.local.md as the default.
