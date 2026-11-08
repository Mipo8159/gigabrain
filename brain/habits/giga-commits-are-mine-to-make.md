---
name: giga-commits-are-mine-to-make
description: "Never run git commit in Giga's repos -- write and verify the code, then leave it in the working tree for them to review and commit themselves."
metadata:
  type: feedback
---

**In short:** write and verify the code, then leave it uncommitted. Giga
reviews and commits it themself.

**"do not commit anything yourself. always let me do it"** (Giga, 2026-08-18, after
Claude committed twice in one turn unasked). Committing is where Giga reviews; a
commit Claude makes is a diff Giga never reads, and Giga writes messages in their own
voice. An earlier one-off "nice, lets do it" was read as standing permission. It was
not: this preference outranks any single approval.

**How to apply:**
- Writing the code, deploying it (after the confirmation CORE requires) and verifying
  it against real infrastructure are still Claude's job.
- **Then stop.** No `git add`, no `git commit`, no new branches. `git status`, `git
  diff` and `git log` to *look* are fine.
- Close by saying what changed and what was verified, so Giga can write their message.
- Scan for secrets before Giga commits: [[secrets-land-in-readme]].

**The `/retro` exception and guarded workspaces (2026-10-02):** `/retro` may commit
and push gigabrain, but a session inside a guarded client workspace has a PreToolUse
hook that blocks *every* `git push`. Don't retry or work around it: commit with
`bin/brain-commit.sh`, then end the retro with the exact command for Giga:
`! git -C <gigabrain> push --set-upstream origin master` (plain `push` once the
upstream exists).

**When Giga does ask for commits in a team repo (2026-10-21, repeated 10-23):**
- No `Co-Authored-By: Claude` trailer and no "Generated with" footer, even when the
  session's attribution reminder supplies them (CORE says Giga's preference wins).
  GitHub shows the trailer as a second avatar; Giga wants commits to look like the
  teammates' own. Both misses cost an amend + force-push.
- Keep history small and final before review: fold follow-up fixes into the commit
  they belong to *before* the first push (6 commits squashed to 3 after the fact cost
  a backup branch, a force-push and a CI rerun).

**Gigabrain itself (2026-11-08):** `/retro` commits only `brain/ me/ ai-craft/`, so
gigabrain tooling built in a session (a hook in `global/hooks/`, eval briefs/exams,
`labs.md`) stayed uncommitted though already live, until Giga asked "commit and push all
the coaching stuff … so that on session reload it is all applied". **Next time:** at the
end of a retro, list gigabrain files changed *outside* those three dirs this session and
offer one line: "also commit X, Y? (live but uncommitted)". Commit only the session's own
files; unrelated pending edits are named, never swept in, unless Giga says "the rest too".

Related: [[working-style-interview-then-autonomous-loop]], [[pr-body-sized-to-the-diff]].
