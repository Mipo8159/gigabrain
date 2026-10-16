---
name: scheduled-jobs-run-where-their-inputs-live
description: "Before choosing a cloud Routine / CI cron over a local scheduler, list the job's inputs: gitignored files, ~/.claude transcripts and a local CLI login never reach a cloud clone of the repo."
metadata:
  type: reference
---

**In short:** a scheduled job runs wherever its inputs live. A cloud Routine
or a GitHub Action sees only what is pushed to GitHub, plus its own
connectors and secrets.

**Why:** 2026-10-17. Claude recommended a cloud Routine for gigabrain's weekly
report, because laptop sleep had killed overnight runs. A later check found
that every input was local:
- `inbox/` (signals, session pointers) is gitignored.
- `bin/usage-report` reads `~/.claude/projects`.
- `claude plugin eval` and the knowledge evals use the local CLI login.

A cloud clone would have produced an empty report. The fix was a local
launchd agent: macOS runs a missed `StartCalendarInterval` job when the Mac
wakes, so sleep delays a run instead of killing it. The cloud Routine kept
the one job that needs only the repo and the network: the upstream drift
check, which opens a PR.

**How to apply:** for each step of a scheduled job, write down where its
input lives (repo, gitignored, home dir, local login, network). If any step
is local, run that part locally. Give the cloud only the steps that have
pure repo or network inputs.

**Signal:** "routine", "cron", "nightly", "weekly report", "run it while
I'm away", together with a repo that has gitignored state or reads `~/.claude`.
**Next time:** put the input table in the brief before naming the scheduler.

Related: [[unattended-runs-keep-mac-awake]], [[worktrees-and-agent-teams]].
