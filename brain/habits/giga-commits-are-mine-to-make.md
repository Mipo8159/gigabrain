---
name: giga-commits-are-mine-to-make
description: "Never run git commit in Giga's repos -- write and verify the code, then leave it in the working tree for them to review and commit themselves."
metadata:
  type: feedback
---

**In short:** write and verify the code, then leave it uncommitted. Giga
reviews and commits it themself.

**"do not commit anything yourself. always let me do it"**: Giga, 2026-08-18,
after Claude committed twice in one turn without being asked (a README
redaction and pipeline step 1).

**Why:** committing is where Giga reviews. A commit Claude makes is a diff Giga
never reads. In a repo with no remote and no CI, the commit message is the only
record of intent anyone will see. Giga also writes commit messages in their own
voice (`restructurize`, `lightweight baby`, `hexagonal simplified`); Claude's
don't sound like the project.

An earlier "commit the current tree?" got "nice, lets do it", and Claude read
that one-off yes as standing permission. It was not. This preference outranks
any single approval. Ask again each time, or better, don't ask and simply hand
the work over.

**How to apply:**

- Writing the code, deploying it (after the confirmation CORE requires) and
  verifying it against real AWS are still Claude's job.
- **Then stop.** Leave the changes in the working tree. No `git add`, no
  `git commit`, no new branches.
- Close by saying what changed and what was verified, so Giga can write their
  own message from that.
- `git status`, `git diff` and `git log` to *look* are fine and expected.
- One related thing is still worth doing unasked: **scan for secrets before
  Giga commits**. See [[secrets-land-in-readme]].

**The `/retro` exception and project guards (2026-10-02):** `/retro` may
commit and push gigabrain. But a session started inside a guarded client
workspace has a hook (PreToolUse) that blocks *every* `git push`, gigabrain
included. The local branch also had no upstream set, so the helper's plain push
failed first. Don't retry or work around the guard. Commit with
`bin/brain-commit.sh`, then end the retro with the exact command for Giga to
run: `! git -C <gigabrain> push --set-upstream origin master` (plain `push`
once the upstream exists).

**When Giga does ask for commits in a team repo (2026-10-21):** leave the
`Co-Authored-By: Claude` trailer out. GitHub turns it into a second (Claude)
avatar on every commit, and Giga wants commits to look like the teammates'
own. Keep the history small and final before review: 6 commits (3 of them
fixes for a quality gate) had to be squashed to 3 and force-pushed. That cost a
backup branch, a force-push and a CI rerun. Fold follow-up fixes into the
commit they belong to *before* the first push, not after.

**Repeat, 2026-10-23:** the trailer and the PR footer went in again, because
the session's attribution reminder was followed over this entry. Giga had
both removed (amend + force-push). The rule now sits in CORE.md: Giga's
preference beats the reminder.

Related: [[working-style-interview-then-autonomous-loop]],
[[giga-wants-argued-recommendations]]
