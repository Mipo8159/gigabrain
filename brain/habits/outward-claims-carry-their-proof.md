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
Each correction cost a round and some trust; measuring was cheap every time.

**How to apply:**
- Draft, then make a claims table: claim → how it's known (ran / read / cited / inferred).
- "Inferred" claims either get a quick check or are worded as a guess ("probably",
  "I haven't checked").
- A precedent is only a precedent after opening the ticket or PR itself, not its title.
- Counts come from a command, never from memory ("~30").
- A past finding quoted as fact is re-checked or carries its "assuming …" along.
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

**Signal:** the text is going to a ticket, a DM, a PR, a channel, or a manager; or
Giga asks "are you sure?" or "be precise".
**Next time:** run the claims pass before the first draft is shown, not after the challenge.

Related: [[giga-wants-argued-recommendations]], [[fact-check-generated-knowledge]], [[a-test-must-be-able-to-fail]].
