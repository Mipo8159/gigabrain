---
name: move-scheduled-jobs-gap-not-overlap
description: "Moving cron/EventBridge jobs to a new stack: ship the new schedules disabled with State (SAM ignores an If on Enabled), keep a gap not an overlap, and find everything outside the stack that targets or toggles the old rules"
metadata:
  type: feedback
---

**Rule:** when scheduled jobs move to a new stack, the old and new schedules must never
both run. The new ones deploy disabled and are switched on per stage after the old ones
are off. Before switching, list everything outside the old stack that uses the old rules.

**Why:** 2026-11-19, work repo (scheduled lambdas moving from a legacy deploy tool to SAM):
- Translating the template locally showed that a SAM `Schedule` event with
  `Enabled: !If [...]` comes out **ENABLED** whatever the condition. The first deploy would
  have run every job twice. `State: !If [cond, ENABLED, DISABLED]` translates correctly.
- The jobs weren't safe to run concurrently (a non-atomic lock, "sent" marked after the
  side effect), so the cutover is a short gap, not an overlap.
- Read-only live reads found a second target on one old rule, owned by another team: turning
  the rule off would silently stop their job.
- The platform team's maintenance script turns rules off and back on *by name*. Left
  unchanged, ending maintenance would re-enable the old rules next to the new ones.
- Old rules had explicit names, so the same names collide on create: new names get a suffix.

**How to apply:**
- Translate the template locally and assert each rule's State for each condition value.
- Use one parameter with a staged value (none / staging / all) when one merge deploys every stage.
- Read live: each old rule's targets, plus a repo-wide grep for the rule names (scripts, alarms).
- Ask the owners in the first ops request: other targets get their own trigger, togglers learn the new names.

**Signal:** a migration of a service that has cron, schedules or periodic rules.
**Next time:** run the translate assertion and the targets/name grep before writing the template.

Related: [[extend-a-deploy-role-diff-features-and-rollback]], [[take-over-a-live-iac-stack-from-another-pipeline]].
