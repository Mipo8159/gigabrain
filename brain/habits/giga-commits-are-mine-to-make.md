---
name: giga-commits-are-mine-to-make
description: "Never run git commit in Giga's repos -- write and verify the code, then leave it in the working tree for them to review and commit themselves."
metadata:
  type: feedback
---

**"do not commit anything yourself. always let me do it"** — 2026-08-18, after I
committed twice unprompted in one turn (a README redaction and pipeline step 1).

**Why:** committing is where they review. A commit I make is a diff they never
read, and in a repo with no remote and no CI, that commit message is the only
record of intent anyone will ever see. They also write their own commit
messages in their own voice (`restructurize`, `lightweight baby`,
`hexagonal simplified`) — mine do not sound like the project.

Note the earlier ask was "commit the current tree?" and they answered
"nice, lets do it" — I read a *one-off* yes as standing permission. It was not.
This preference outranks any single approval; ask again each time, or better,
do not ask and simply hand the work over.

**How to apply:**

- Write the code, deploy it, verify it against real AWS — all still mine to do.
- **Then stop.** Leave the changes in the working tree. Do not `git add`,
  do not `git commit`, do not create branches.
- Close out by saying what changed and what was verified, so they can write
  their own message from that.
- `git status` / `git diff` / `git log` to *inspect* are fine and expected.
- The one adjacent thing still worth doing unprompted: **scanning for secrets
  before they commit** — see [[secrets-land-in-readme]].

**The `/retro` exception and project guards (2026-10-02):** `/retro` may commit
and push gigaforge, but a session started inside a guarded client workspace has
a PreToolUse hook that blocks *every* `git push`, gigaforge included. The local
branch also had no upstream set, so the helper's plain push failed first. Don't
retry or route around the guard. Commit with `bin/brain-commit.sh`, then end the
retro with the exact command for Giga to run:
`! git -C <gigaforge> push --set-upstream origin master` (plain `push` once the
upstream exists).

Related: [[working-style-interview-then-autonomous-loop]],
[[giga-wants-argued-recommendations]]
