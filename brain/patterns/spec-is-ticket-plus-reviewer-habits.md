---
name: spec-is-ticket-plus-reviewer-habits
description: "Before opening a PR in a team repo, the spec is the ticket + the team playbook + what that repo's reviewers have asked for before. Mine their past comments into a checklist, automate the mechanical rows, and prove the check flags the known misses. 2026-11-19: a ticket-only audit passed a PR that drew 3 review asks the next hour."
metadata:
  type: feedback
---

**In short:** a ticket lists what to build, not what reviewers will push back on.
Before a PR goes up, read the human review comments on the 5–8 closest earlier PRs in
that repo, turn the repeat asks into a checklist, and script the mechanical ones
(dropped packages, version source, unused files). Then run the script on the commit
that drew the comments: it must flag exactly those.

**Why:** 2026-11-19, a large migration PR passed a three-part audit plus an
intent review against the ticket. The reviewer still asked for 3 things within an hour:
- a test library the playbook drops, which the ticket also named. We had deferred it on
  an estimate ("touches 46 files") that was wrong, because the files were new in the PR;
- a docs file the ticket said to keep;
- a config file nothing read.
All 3 matched habits visible in the same reviewer's comments on earlier PRs ("use the
shared version", "is this in use? if not, remove").

**How to apply:**
- Mine with `gh api repos/<o>/<r>/pulls/<n>/comments` + `/reviews`, human authors only,
  and keep the checklist next to the project's gate tool, not in the repo.
- Code counts as a consumer of a file only when it is code or build config. Docs don't
  count: the first version counted a README mention as use and missed both unused files.
- A deferred ticket rule needs a measured cost and a precedent, written in the PR body.
- When asked "did we do X per the ticket?", audit the ticket's whole clause that names X,
  not just X. Here the clause on test stubs also set two mocking rules we had changed
  without giving a reason.

**Signal:** "is it ready for review", "open the PR", a migration that follows earlier
ones in the same repo, or a first PR in a repo with a strict reviewer.
**Next time:** before the PR, run the precedent check + walk the checklist; show the
score next to the test results.

Related: [[outward-claims-carry-their-proof]], [[own-tooling-fails-silently]], [[ticket-names-where-code-used-to-live]].
