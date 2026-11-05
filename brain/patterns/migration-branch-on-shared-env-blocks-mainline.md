---
name: migration-branch-on-shared-env-blocks-mainline
description: "A branch whose DB migration ran on a shared staging DB, then left unmerged, makes every mainline deploy fail (knex: 'migration directory is corrupt, files missing'). Merge it the same day or roll it back with down() the same day; and when a risk is found for one PR, re-check every PR that shares the mechanism."
metadata:
  type: feedback
---

**In short:** on a shared-DB service, a migration branch may live on staging
only on the day it merges. Otherwise run its `down()` the same day.

**Why:** 2026-11-03/04, a work repo, a multi-repo removal rollout. One PR held
a policy migration and was planned to stay unmerged for about a week (a prod
gate). Claude's staging plan had it deployed from its branch and noted "stays
on branch". The migration ran. The tracker DB then listed a file that mainline
didn't have, and the migration runner (knex `validateMigrationList`) refused
every later deploy: mainline twice, then another team's branch. It took
~26 hours and a teammate's Slack ping before anyone noticed. The teammate
removed the row by hand. Whether the data change was also reverted stayed
unknown, because Giga had no read access to that DB server.

The mechanism had been written down 5 days earlier ("migrate:latest should
fail on a migration it doesn't know", marked *inferred, not run*). It was
applied to the column-drop PRs, which were split out, but not to this PR,
which was "also a migration" in the same note. The staging check passed on
"migration exit 0" and never asked whether mainline could still deploy.

**How to apply:**
- Before deploying any branch with a migration to a shared env, ask "when does
  it merge?". If that's not today, test the migration locally (an up→down
  test), or deploy and run `down()` before end of day.
- The staging check for such a branch includes one more line: **mainline still
  deploys afterwards.** Watch the next mainline deploy, or roll back first.
- When a risk is found for one item, list every item sharing the mechanism
  (here: every PR containing a migration file), not only the item that
  triggered the finding. `gh pr view --json files` per PR answers it in one loop.
- Prove an "inferred" mechanism before a plan rests on it. Reading the runner's
  source or running it once locally takes ten minutes.
- Know who can roll back before deploying. Here the developer role could start
  tasks but not register task definitions or pass roles, and had no DB login.
  The rollback depended on finding a teammate.
- Evidence without DB access: the migration task's logs. Batch numbers show
  whether a row was removed: the next successful batch reuses the same number.
  A "rolled back" line shows `down()` ran. Its absence means a hand fix.

**Twin failure: two branches, one version number (2026-11-05, same rollout).**
Runners differ in what they log. knex logs the file *name*, so two files with
one timestamp both run (that repo's mainline already held such a pair). phinx
logs only the 14-digit *version*, so a clash fails twice: on shared staging,
where another team's branch had already logged that number, our migration is
silently skipped and the deploy goes green; on mainline, once both files exist,
phinx throws "Duplicate migration" before running anything, so every deploy
fails. Found before merge by reading the runner source, then scanning master
plus all open PRs for "same version, different file". Fixed by renumbering our
draft (theirs was already logged).
- For a version-keyed runner, check the number against mainline **and every open
  PR** before merging, not just against mainline. CI on stacked drafts often
  skips, so nothing else catches it.
- Pick the side that renumbers: the one not yet applied anywhere.

**Signal:** a staging plan says "deploy branch X, merge later", and X touches a
migrations folder. Or "mainline deploy failed at the migrate step" after
someone tested a branch.
**Next time:** in the plan, mark each migration PR "staging = merge day only",
and add "mainline deploys green" to its staging checklist. For a version-keyed
runner (phinx, Flyway-style), add "version unique across mainline + open PRs".

Related: [[in-place-value-migrations-race-deploys]], [[removal-inventory-is-one-sweep-not-a-drip]], [[outward-claims-carry-their-proof]].
