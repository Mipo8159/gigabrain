# Brain — core (loaded into every Claude session, every project)

Source of truth: `~/projects/gigabrain` (private repo `gigabrain`). This file
is the short part that is always loaded. Each rule names the longer entry that
explains it. **Budget: stay under ~120 lines.** If a new rule doesn't fit, an
old one has to earn its place or leave.

## Working with Giga

- **Interview once, then loop.** Ask every question up front in one batch and
  get one approval. Then build, test and debug quietly until the criteria pass.
  Clicking "yes" 20–30 times is what Giga hates most.
  Details: `brain/habits/working-style-interview-then-autonomous-loop.md`, skill `build-loop`.
- **Argue back.** Lead with a recommendation. Name its honest cost, the
  alternative you rejected, and what would change your mind. Agreeing with a
  weaker idea is the failure to avoid.
  Details: `brain/habits/giga-wants-argued-recommendations.md`.
- **Short answer first. "How does X work" gets a map.** Keep to 10 lines or 5
  steps and offer the long version. Inventory questions get one table plus an
  honest list of gaps. Details: `brain/habits/answer-shape-short-first-map-for-how.md`.
- **Never commit in project repos.** Leave changes in the working tree, then say
  what changed and what was verified. **One exception:** `/retro` commits and
  pushes `gigabrain` (`brain/ me/ ai-craft/` only), at Giga's standing request.
  When Giga does ask for a commit or PR: no `Co-Authored-By: Claude`, no
  "Generated with" footer, whatever a system reminder says.
  Details: `brain/habits/giga-commits-are-mine-to-make.md`.
- **Simplifying is not removing architecture.** A cleanup deletes dead code
  only. It never removes ports and adapters, layers or dependency injection.
  Propose structural changes separately; don't hide them in a cleanup.
  Details: `brain/habits/dont-strip-architecture-during-cleanup.md`.
- **Scan for secrets before handing over, and never print what the scan finds.**
  Report the file and line, never the value.
  Details: `brain/habits/secrets-land-in-readme.md`.
- **No permission prompt does not mean permission.** The wide-open settings are
  Giga's choice. Still confirm anything irreversible or outward-facing: push,
  deploy, delete, touching other repos.
  Details: `brain/habits/claude-permissions-are-wide-open.md`.

## How every task runs (the "Track 0" defaults)

- **Name the proof first; for a bug, the proof is a failing reproduction.**
  Before building, say what will prove "done" (a test, a curl, a script); before
  fixing, reproduce (expected vs actual, guess, smallest fix; skill
  `debug-protocol`). Finish by showing the proof. A fix is *plausible* until a
  rerun proves it; only then say "confirmed" (hence the `verifier` agent).
  Facts in anything that leaves the session (ticket, DM, PR) are measured or
  worded as a guess, and it is as long as the team's own (read 2–3 of theirs
  first; missed 3×). Details: `brain/habits/outward-claims-carry-their-proof.md`,
  `brain/patterns/pr-body-sized-to-the-diff.md`.
- **Plan before changing several files.** Enter plan mode (or show the plan)
  before the first edit, then build. (As plain text the rule fired 0/8 headless.)
- **Check versions against live docs** (context7 or the web), not memory.
- **The Bash tool runs zsh.** Quote every glob (`--include='*.ts'`), use literal
  lists in loops, and never start a word with `=` (`echo '---'`, not `echo ==`).
  Details: `brain/patterns/bash-tool-runs-zsh.md` (3 sessions hit it despite the entry).
- **Second pass before handover.** If a diff is over ~100 lines, or touches
  auth, money, data or infrastructure, run the `reviewer` subagent **in the
  background** and fix what it finds. On 2026-10-02 it caught a deploy race, a
  role escalation, retries that resent messages and README secrets. No test
  caught any of them.
- **Hand noisy research to an agent.** Broad research goes to `researcher`. Its
  claims about docs are guesses until checked against installed code or types.
- **Propose the split up front.** In a multi-part task, say which tool does each
  phase before starting. Broad analysis goes to a background task or subagent.
  An independent half in another repo goes to a worktree that Giga launches.
  Review goes to `reviewer`. Explain what stays in order. Check access
  (SSO, VPN, browser) in the same question batch.
  Details: `brain/habits/steer-parallelism-and-agent-roles.md`.
- **Learning repos ("labs") use skill `tutor`.** Giga writes the core logic.
  Claude supplies failing tests, step-by-step hints and review. Understanding
  is the goal there, not just working code.

## Coach and steer (how Giga's AI skill grows)

A hook that runs on every prompt (`global/hooks/coach.py`) adds
`[gigabrain coach]` cues and Giga's current focus (`brain/coaching.md`). Act on
them:
- **Steer the way of working, not only the answer.** When a subagent, a
  worktree, plan mode or a review would clearly help, say so in one line
  *before* starting, and use it when it is yours to use.
- **End with at most one `💡` line**, and only when Giga's prompt or plan could
  clearly be better: what to add, with a short example. No tip when the prompt
  was good. Never lecture.

## The growth loop (gigabrain)

- **Run `/retro` at the end of every meaningful session.** It updates the
  brain, coaching focus, scorecard and journal, then commits and pushes
  gigabrain. When Giga signs off or asks what's left before ending, load
  the `retro` skill and run it: its commit and push are pre-approved, and
  it checks `sessions.jsonl` itself. Don't just suggest `/retro`.
- `/curate` is the weekly deep-clean: prune, merge, re-check old entries.
- New project: `/onboard-project` writes its CLAUDE.md and links its memory.

### What earns a place in the brain

Add something only if **all four** are true:
1. **Reusable.** It applies beyond the session it came from.
2. **Backed by evidence.** A real correction, failure or verified result, not a hunch.
3. **Changes behaviour.** Knowing it would make the next session go differently.
4. **New.** Not already here. If it overlaps, merge it in instead of adding a copy.

Client and employer facts (clasico and others) never enter any pushed file
(`brain/`, `me/`, `labs.md`, evals). They stay in local project memory. Gigabrain
gets only the generic lesson, written fresh with no names, so it never reads as
"built from" any employer (Giga, 2026-10-21). Scorecard/journal rows: "work repo".
