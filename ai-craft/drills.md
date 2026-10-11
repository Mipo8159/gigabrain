# Track 0: working with Claude (the main track)

One drill per session, on **real work**, not toy examples. Each drill has a
done-criterion, because practising that is itself drill 2. Tick it, then
`/retro`.

| # | Drill | Feature | Done when | ✔ |
|---|---|---|---|---|
| 1 | Onboard clasico | `/onboard-project`, CLAUDE.md | clasico has a lean CLAUDE.md; your next clasico task needs zero re-explained conventions | |
| 2 | Prove it | done-criteria | 5 consecutive tasks started with a "done when…" line and ended with shown proof | |
| 3 | Plan first | plan mode (shift+tab) | one multi-file change where you corrected the plan *before* code was written | |
| 4 | Two at once | `claude --worktree` / EnterWorktree | a clasico ticket and issue-flow step 01 progressed in parallel sessions the same hour | |
| 5 | Enforce, don't remind | hooks + permissions | a hook formats code after edits; `git commit` by Claude is blocked by a rule, not by memory | |
| 6 | Second opinion | `reviewer` subagent, `/code-review` | a review found a real issue in a diff you were about to accept | |
| 7 | Headless | `claude -p`, `/schedule` | a script calls `claude -p` for a real job, and a scheduled weekly task runs | |
| 8 | Steal good ideas | public skills / plugins | installed ≥1 skill from `anthropics/skills` or the plugin marketplace; compared one with `build-loop` and kept the better idea | |
| 9 | Debug like a pro | `debug-protocol` | one bug reported as expected/actual/hypothesis, fixed with a reproduction shown red → green | |
| 10 | Teach it back | `tutor` | issue-flow step 01 outbox relay written by you; explained aloud without notes | |

## After Track 0

Re-score `me/scorecard.md`. Anything still ≤ 3 gets a second drill of your
own design. Writing that drill is part of the exercise.

## Staying current (monthly, ~30 min, or ask the `researcher` agent)

- Claude Code changelog / release notes: new features you aren't using yet
- Anthropic engineering blog: how Anthropic's own teams use Claude
- `anthropics/skills` and the official plugin marketplace: what's new
- One practitioner blog you trust (e.g. Simon Willison, Addy Osmani)

Write one line per new practice you'll adopt into `ai-craft/prompt-log.md`.
