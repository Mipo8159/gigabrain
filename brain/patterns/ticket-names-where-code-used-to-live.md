---
name: ticket-names-where-code-used-to-live
description: "Tickets (especially bot- or Slack-generated ones) name the repo where the code lived when the ticket was written; after a migration (e.g. into a monorepo) the work belongs elsewhere. Check the named repo's last commit and grep the new home before starting."
metadata:
  type: feedback
---

**In short:** before working a ticket, confirm the repo it names is still where the
code lives. A ticket generated from a deprecation report named a single-service
repo whose last commit was months old; the same code had moved into a monorepo
provider folder (the migration ticket was already Done).

**Why:** 2026-10-20, work onboarding. The ticket, the handoff and the plan all said
"clone <old-service> and review it". A 30-second check (`git log -1` on the old
repo, `grep -rl <api-term>` in the monorepo) showed the live code elsewhere.
Reviewing the dead copy would have produced findings for code no longer deployed.
A sibling ticket by a teammate (In Review) was also migrating the same API calls,
so the review could overlap work about to land.

**How to apply:**
1. `git log -1 --format=%cs` on the named repo; months idle while the team is busy = suspect.
2. Grep the likely new home (monorepo, `providers/`, `packages/`) for the ticket's key terms.
3. Search the tracker for open tickets touching the same API or files; read their PRs first.
4. Tell the ticket reporter where the code now lives; let them confirm before work starts.

**Signal:** a ticket from Slack/a bot/a report; the team mentions a monorepo or
"migrate X to …" epics; the named repo is quiet.
**Next time:** add "confirm code location + overlapping tickets" as step 0 of the ticket session.
