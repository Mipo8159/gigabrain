---
name: effort-from-git-is-calendar-not-focus
description: "How long did X spend on Y" from git/PRs measures calendar time; commit timestamps lie after a squash; focused effort is a labelled guess from activity days and parallel load
metadata:
  type: pattern
---

Git and PR data measure **calendar time to done**, not focused effort. Commit
timestamps are unreliable for effort: an author who squashes or rewrites a local
series shows dozens of step commits inside one hour, hiding the week before the PR.

**Why:** 2026-11-19, asked how long a teammate spent on a repo migration: 28 step
commits fell inside 60 minutes on the PR's first day, so counting commit dates
would have reported ~5 days instead of ~15 elapsed. The honest answer needed the
ticket start, PR open→merge, the follow-up rollout PRs, and every other PR and
review the person had in the same window.

**How to apply:**
- Elapsed = ticket in-progress (or first related PR) → last rollout PR merged, in working days.
- Activity days = dates with commits/PRs on the task; a burst of commits in minutes = rewritten history, treat the pre-PR period as unseen.
- Parallel load = `gh search prs --author <login> --created <window>` plus `--reviewed-by` count.
- Report a table (phase, dates, days), then focused effort as a range labelled a guess.
- When feeding an estimate, say whether the precedent median already includes parallel work.

**Signal:** "how long did <person> spend", "how much effort was X", comparing a plan's estimate to a teammate's past task.

**Next time:** ask (or state) which one is meant, calendar or focused; only calendar is measurable from git.
