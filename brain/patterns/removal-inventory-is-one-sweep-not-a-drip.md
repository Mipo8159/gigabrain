---
name: removal-inventory-is-one-sweep-not-a-drip
description: "Deprecation/removal work: list every identifier of the thing (names, flags, columns, env vars, roles, mappings) and grep all repos for all of them once, up front; never park found leftovers in a silent 'later' bucket. The user decides now vs later."
metadata:
  type: feedback
---

**In short:** when removing a feature, service or package, build the full
identifier list first and sweep every repo for all of it in one pass. Show
everything you find, split into "in these PRs" and "could wait", and let Giga
choose. Never defer a found leftover on your own.

**Why:** in two removal tasks, the scope dripped out one question at a time,
and each "are you absolutely sure?" turned up more:
- 2026-10-26/27: a service removal across repos. Certainty was asked for 5
  times, and the repo count changed from 9 to 5 between answers.
- 2026-10-28/29: an SDK deprecation. A team lead found 2 missed UI PRs. Then
  backend fields, a flag that another service still stored, and two DB columns
  surfaced on later days. Giga asked: "how come we are discovering these new
  additions every time?" Claude's own answer had two causes. First, it had
  already found most of them and put them under "Later: …" in the ticket
  comment without asking. Second, each search covered only the thing just asked
  about (the service, then the UI, then the flag), so cross-service users such
  as an auth-role field and an MCP mapping were found last. Giga's call: "I
  control what goes where and when it gets released", so fold everything into
  the current PRs and open no follow-up tickets.

**How to apply:**
1. Before the first PR, write the identifier list: the feature name in every
   casing, its flags, its DB columns and tables, env vars, role or permission
   fields, API fields, routes and UI pages, and package names.
2. Grep every checked-out repo for every identifier in one batch, as an agent
   fan-out across repos if there are many. Record the hits as a table: repo,
   file:line, what it is.
3. Present the whole table with a recommended now/later split. "Later" is a
   proposal for Giga to accept, never a quiet default. Write it nowhere outward
   (a ticket, a PR) until Giga has chosen.
4. Done when a re-run of the same grep, after the PRs, shows only the hits Giga
   chose to keep (old migrations, for example).

**Signal:** "deprecate", "remove", "clean up leftovers", "sunset"; a team lead
asking "was X removed too?"; Giga asking for certainty about completeness.
**Next time:** answer the first removal question with the identifier list and the
all-repo sweep, before scoping any PR. Related: [[ticket-names-where-code-used-to-live]].
