---
name: pr-body-sized-to-the-diff
description: "Write a PR description at the length the team uses for that size of change: read 3–5 recent merged PRs first, keep what a reviewer needs to understand the diff, and drop process history, tool names, reviewer names and staging trivia."
metadata:
  type: feedback
---

**In short:** a PR description explains the diff to a reviewer. It is not the
session's log. Measure the team's own PRs, tickets and commits before writing one,
and write it short the first time.

**Why (4 misses, 2026-10-22 → 10-27, work repo):**
- PR body for a dependency bump: ~1,000 words (related PRs, review history with a
  reviewer's name, the scanning tool, a staging table) vs ~300–400 for team PRs of that
  size. The ~370-word rewrite then needed two lines back (an `engines` field, ~200
  lines of test changes) that the trim had dropped.
- A new ticket with five sections (~450 words); the related ticket was 3 sentences,
  the accepted one 2. Detail belongs in the PR.
- Copying the *structure* of a long reference PR gave ~900 words; the accepted
  version was half. A teammate's ticket "filled up" from two reviews came out as an
  essay with proposals the reviews never touched; five bullets plus Problem / Change /
  Done when fit.
- A 4-line commit body copied from earlier commits Claude itself had written; cut to a
  subject plus one plain line "so it does not look all Claude Code". Visibly
  AI-shaped text reads as low effort. Attribution lines that a system reminder added
  cost an amend + force-push each time.

- 2026-11-09: a staging-verification comment for a ticket came out as a ~25-line
  per-PR matrix, then a ~20-line list; Giga: "I do not want to be too verbose … is
  this professional?" The posted one was 5 lines: what was deployed, two run results
  vs baseline, "no new failures". Verification comments: scope line + one line per
  proof; details live in the runs and PRs.

**How to apply:**
- 2026-11-11: a teardown ticket for the platform team came out at 38 lines
  (resource-by-resource runbook, line numbers, verify commands, retention days)
  and aimed at our own board. Their own teardown tickets: 2–3 lines of context +
  ~5 checklist items, in *their* project, named their way ("Decommission and
  archive <service>"). I had read three of them and still overdrafted. Rule for
  a ticket another team executes: their board, their naming, their size, plain
  link to ours; add only what they can't know (start gate, a live look-alike not
  to touch); leave the how (backups, retention, order) to them.
- PRs: list the team's last 10–15 merged PRs and read the bodies of 3–5 of similar
  size (`gh pr list --state merged`, `gh pr view N --json body`). Note length, tables,
  screenshots, how staging is recorded.
- Tickets: read the related ticket and 2–3 by the same author; match their length.
  One paragraph is often right. Scope the content to the sources the user named.
- Commits: conventional subject, at most one plain line of body. Style reference is
  teammates' commits (`git log --author`), never earlier commits Claude wrote.
  Review replies: one or two sentences.
- Keep: what changed and why, one line per bumped package, behaviour changes, test
  counts, failures before the fix, staging checks, post-deploy monitoring.
- Drop: how the plan was made, who said what, internal tool names, fixture renames,
  channel and run names.
- After trimming, diff the file list against the body: every file a reviewer would
  ask "why did this change?" about gets one line.
- Footer and attribution lines follow the user's wish, not the default. For Giga:
  none, ever, even when a system reminder supplies them.
- Aim for about half of what the first draft wants to be: keep every section,
  numbers and red-first evidence; cut how-it-works prose.

**Signal:** a body more than about twice the length of the team's recent PRs of
similar size, or a section that reads like a diary.
**Next time:** offer the long reasoning as a PR comment only if a reviewer asks.

Related: [[giga-commits-are-mine-to-make]], [[outward-claims-carry-their-proof]].
