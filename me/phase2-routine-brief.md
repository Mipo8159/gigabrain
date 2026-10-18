# Phase 2 brief: the weekly report job (for Giga's `claude -w routine` session)

Written 2026-10-17. Paste the prompt below as the first message of
`cd ~/projects/gigabrain && claude -w routine`. That launch is also your first
worktree (coaching: Agents and parallel work, count 0 → 1).

## The prompt to paste

> Do the roadmap `Now:` step (phase 2). Build `bin/weekly-report` plus a
> macOS launchd agent that runs it every Monday 09:00. It writes
> `inbox/weekly-<date>.md` with: `bin/signals-report.py`,
> `bin/usage-report --days 7`, `bin/check-library.py --drift`,
> `bin/eval-skills` + `bin/eval-forced --runs 2`, and
> `bin/eval-knowledge --domain process --arms base,brain` (the CORE
> regression). It never commits or pushes; /curate reads the file.
> Done when: `bin/weekly-report` run by hand writes the file with all 6
> sections (each says ok/fail, cost in $); `launchctl print` shows the agent
> loaded; a forced `launchctl kickstart` writes a second file. Budget: $15
> per weekly run, split: eval-skills $3, `eval-forced --runs 2 --max-cost 2`
> ($4 for both arms), eval-knowledge $8 (check its cost flag first). A section
> that fails must not stop the others. Ask first before installing anything.

## Why local launchd, not a cloud Routine (changed 2026-10-17)

Earlier I recommended a cloud Routine because Mac sleep had killed runs. Then
I checked the inputs:
- `inbox/` is gitignored, so `signals.jsonl` and `sessions.jsonl` never reach GitHub.
- `bin/usage-report` reads `~/.claude/projects`, which exists only on the laptop.
- `claude plugin eval` and `bin/eval-knowledge` need your local CLI login.

A cloud Routine clones the GitHub repo and would see none of these. launchd
runs a missed calendar job when the Mac wakes up, so sleep is not fatal.

**A cloud Routine still fits one job:** the upstream drift check
(`check-library --drift` only needs the repo and the network). Add it later if
you want a PR when ECC changes. Its cost: research preview, a 1-hour minimum
interval, and the Claude GitHub App on the repo.

## Merge back

Review `git diff master...worktree-routine`, then merge and commit it yourself.
After that, `/retro` moves `Now:` to phase 3.
