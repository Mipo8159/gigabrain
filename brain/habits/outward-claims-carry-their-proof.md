---
name: outward-claims-carry-their-proof
description: "Every fact in text that leaves the session (ticket, DM, PR body, comment) is measured, cited, or labelled a guess before Giga sees it. 2026-10-22/23: three work sessions in a row had first drafts with unverified claims that Giga's 'are you sure?' caught."
metadata:
  type: feedback
---

**In short:** before handing Giga anything another person will read, list its
factual claims and give each a source: a command you ran, a file:line, a fetched
page, or the word "guess". Unsourced claims get measured or cut.

**Why:** "please be precise with your reasoning, I do not want to look like a fool
creating a ticket which does not match reality" (Giga, 2026-10-22). Hits since:
- 2026-10-22/23, three work sessions: a deprecation comment missed a second caller;
  an IP-allowlist verdict at "~90%" was rebuilt 4 times; a ticket draft said "~30
  consumers" (27 counted), "a major source of advisories" (39 → 31 measured), cited
  another team's ticket by its title (it was about something else), and claimed a
  lockfile refresh reaches consumers (false).
- 2026-10-28: "100% positive axios calls stay the same?" was an inference; a 3-minute
  probe settled it. When the question is certainty, measure the inference rather than
  defend it.
- 2026-10-26 (re-used conclusion): an earlier session's "assuming all rows share one
  integration" was quoted as fact; a second channel got the message too.
- 2026-10-27 (shortening): the short rewrite of a teammate's ticket merged sources
  and invented who flagged what.
- 2026-10-27 (a test proves only its claim): a "secrets are redacted" test asserted
  the one attribute the change touched; a reviewer found the secret in a second one.
- 2026-11-04 (recall): a suite run "we did" in another session had never happened.
- 2026-11-05/06 (state words): "completed and rolled back" when only the tracker row
  was gone (a teammate's project creation broke next day); "merged" for a PR whose
  `gh` state was `CLOSED`.
- 2026-11-10 (ticket text as proof): an onboarding lesson marked "tables owned by the
  new stack" as done from a commit message + the ticket's own words; Giga's "are you
  confident … not hallucination?" downgraded it to "likely". Same session: "you already
  have something done" was hearsay; the PRs showed a teammate did that work.
- 2026-11-17 (standup line): "is this absolutely precise? show me codewise" before
  a daily-meeting statement; the rewrite said "local branch" and "probably SSM", and
  a later "where have you seen this?" found the cited permissions belonged to another
  resource in the same file (see [[fact-check-generated-knowledge]]).
- 2026-11-19 (handoff as fact): a session-start handoff said "DevOps must create
  parameter X"; Claude repeated it, and Giga's "don't we already have it?" found a
  deeper note (and the infra code) saying it existed for months. The same session's
  channel draft said a red check was "red on purpose" and that DevOps was "handling"
  a PR with no assignee and no DevOps review; Giga's "100% guaranteed?" cut both.
- 2026-11-24 (expected-red, again): a status table called two red CI checks
  "red for the expected reason"; Giga: "check the PR instead of guessing". The job logs
  confirmed it (access denied, the guard stopped before anything deployed) and showed a
  difference the guess had missed (one stack had no ID yet, so it may not exist).
  Same day, a precedent Giga remembered ("an infra ticket archived the old repos after
  the merge") was proven in 3 calls: the archived repos' `updatedAt` clustered on one
  morning, and a tracker search near that date found the ticket. It also showed the old
  repos were never frozen in between (one got a merge two months later).
Each correction cost a round and some trust; measuring was cheap every time.

**How to apply:**
- Draft, then make a claims table: claim → how it's known (ran / read / cited / inferred).
- "Inferred" claims either get a quick check or are worded as a guess ("probably",
  "I haven't checked").
- A precedent is only a precedent after opening the ticket or PR itself, not its title.
- Counts come from a command, never from memory ("~30").
- A past finding quoted as fact is re-checked or carries its "assuming …" along.
- A ticket's description is a claim about the world, not proof of it. Label it
  "per ticket" until checked; for "already done" work, name who did it and the PR.
- Shortening merges sources: run the claims pass again on the *final* text (for each
  "X did/flagged/said Y", name where it came from), and show the draft in chat before
  writing into someone else's ticket.
- Any "nothing leaks / nothing else changes" claim: assert the negative over the
  whole output (scan *every* exported field; red on old code, green on the fix), and
  read the library line that writes each field instead of trusting an option's name.
- Before restating what "we did" in another session, grep that transcript or its
  memory note for the run's output; no output, no claim. Rows with no real check get
  cut, not padded.
- End-state words (*rolled back*, *merged*, *deployed*, *reverted*) need the state
  itself checked: the rows, `state == MERGED`, a successful deploy run.
- When a reviewer or later check overturns something Giga already has, say so plainly
  at the top, before the fix.
- Open every PR or commit you cite as history and check it touched *the same thing*: a PR
  cited as part of a role's history had changed a sibling role (2026-11-17, caught before
  push). Precedent tables built by script (author, approver, days) beat remembered ones.

- Tag claims in answers Giga will act on: `✔ checked` (command / file:line),
  `📝 memory/handoff, not rechecked`, `? inference`. A claim that triggers an action
  (ask another team, rerun CI, post, merge) is checked before it is said; if it
  can't be checked here, say so and hand over the command.
- Handoff and memory notes are claims too: check them against code before repeating.
  So is a status line in Giga's own prompt (2026-11-20: "step 2 is sent" was repeated as fact;
  ticket search + git showed nothing was filed). Check "sent / merged / deployed" before building on it.
  When a fact turns out wrong, grep every memory note for it and fix all copies.
- "Is this 100% guaranteed?" splits into what is proven *now* (the error text from the
  system itself, on the current head) and what only a future run can prove; word the
  message so it claims only the first.

- "Ready to push" is a claim about the exact tree, now: rerun the proofs on it, not the
  numbers from before. 2026-11-19: a later `pnpm install` had quietly re-resolved shared
  deps for two other packages (lock vs main +55/-191, after "+52/-0" was reported). After
  any package-manager install, diff the lockfile against the base branch and the pushed
  head; a change in another package's entry is drift.

- A red check is "expected" only with its failing log line quoted
  (`gh api --allow-escape-sequences repos/O/R/actions/jobs/<id>/logs`, strip ANSI).
  A precedent the user remembers gets the same check; for "when was X archived/changed",
  cluster the artifacts' timestamps first, then search the tracker on that date.

**Signal:** the text is going to a ticket, a DM, a PR, a channel, or a manager; or
Giga asks "are you sure?" or "be precise".
**Next time:** run the claims pass before the first draft is shown, not after the challenge.

Related: [[giga-wants-argued-recommendations]], [[fact-check-generated-knowledge]], [[a-test-must-be-able-to-fail]].

- Length rule (moved from CORE 2026-11-19): read 2–3 of the team's own first; missed 4× before it moved into CORE.
