---
name: pr-body-sized-to-the-diff
description: "Write a PR description at the length the team uses for that size of change: read 3–5 recent merged PRs first, keep what a reviewer needs to understand the diff, and drop process history, tool names, reviewer names and staging trivia."
metadata:
  type: feedback
---

**In short:** a PR description explains the diff to a reviewer. It is not the
session's log. Measure the team's own PRs before writing one.

**Why:** 2026-10-22, a work repo. Claude's description for a dependency-bump PR
had grown to ~1,000 words: related PRs, the plan's review history with a
reviewer's name, the scan tool that raised the ticket, test-stub moves, and a
four-row staging table. The user asked whether it was "too thick for a small
PR". Recent team PRs of that size ran ~300–400 words. The rewrite was ~370
words. Then an honest second look found two holes the trim had opened: an
`engines` field and ~200 lines of test changes were no longer explained. Each
took one line to close.

**How to apply:**
- First list the team's last 10–15 merged PRs and read the bodies of 3–5 of
  similar size (`gh pr list --state merged`, `gh pr view N --json body`). Note
  the length, whether they use tables or screenshots, and how they record
  staging.
- Keep: what changed and why, one line per bumped package, behaviour changes,
  test counts, failures before the fix, staging checks, post-deploy monitoring.
- Drop: how the plan was made, who said what, internal tool names, fixture
  renames, channel and run names.
- After trimming, diff the file list against the body. Every file a reviewer
  would ask "why did this change?" about gets one line.
- Footer and attribution lines follow the user's wish, not the default.

**Signal:** a body more than about twice the length of the team's recent PRs
of similar size, or a section that reads like a diary.
**Next time:** write it short the first time. Offer the long reasoning as a
PR comment only if a reviewer asks.

Related: [[giga-commits-are-mine-to-make]].
