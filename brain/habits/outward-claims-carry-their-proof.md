---
name: outward-claims-carry-their-proof
description: "Every fact in text that leaves the session (ticket, DM, PR body, comment) is measured, cited, or labelled a guess before Giga sees it. 2026-10-22/23: three work sessions in a row had first drafts with unverified claims that Giga's 'are you sure?' caught."
metadata:
  type: feedback
---

**In short:** before handing Giga anything another person will read, list its
factual claims and give each a source: a command you ran, a file:line, a
fetched page, or the word "guess". Unsourced claims get measured or cut.

**Why:** Giga said it outright on 2026-10-22: "please be precise with your
reasoning, I do not want to look like a fool creating a ticket which does not
match reality". The same day, three work sessions shipped first drafts with
claims nobody had checked:
- A deprecation-impact comment missed a second caller until "are you absolutely sure?".
- An IP-allowlist verdict at "~90%" missed a proxy WAF; it was rebuilt 4 times as each "100% sure?" added a layer.
- 2026-10-28: "you are 100% positive axios calls stay the same?" The honest answer was "inference: axios uses the same `http.request` I measured". Turning it into a probe (real axios × 3 versions × old/new library) took 3 minutes and settled it. When the question is certainty, measure the inference rather than defend it.
- A ticket draft for a shared library said: "~30 consumers" (invented; 27 counted), "an unused dependency is a major source of the advisories" (39 → 31 when measured), "another team filed its own ticket for this" (their ticket turned out to be about something else; only the PR title matched), and "the lockfile refresh fixes every service that installs the new version" (false: consumers resolve from their own lockfiles; the reviewer caught it after the claim had already reached Giga).

Each correction cost a round and some of Giga's trust. Measuring was cheap
every time (a grep, an `npm audit` in a scratch copy, one `getJiraIssue`).

**How to apply:**
- Draft, then make a claims table: claim → how it's known (ran / read / cited / inferred).
- "Inferred" claims either get a quick check or are worded as a guess ("probably", "I haven't checked").
- A precedent is only a precedent after opening the ticket or PR itself, not its title.
- Counts come from a command, never from memory ("~30").
- When the reviewer or a later check overturns something Giga already has, say so plainly at the top, before the fix.

**Signal:** the text is going to a ticket, a DM, a PR, a channel, or a manager; or Giga asks "are you sure?" or "be precise".
**Next time:** run the claims pass before the first draft is shown, not after the challenge.

Related: [[giga-wants-argued-recommendations]], [[fact-check-generated-knowledge]].

**Re-used conclusions keep their caveat** (2026-10-26): Claude told Giga a
notification would reach only one channel, re-using an earlier session's
explanation whose stated assumption ("all rows share one integration") was
never checked. A second channel got it too. When a past finding is quoted
as fact, either re-check it or carry its "assuming …" along.

**Shortening can create false claims** (2026-10-27): Claude wrote straight
into a teammate's ticket. The long draft said "each review took about half a
day" (made up, then removed). The short rewrite then said "the legacy poller
was flagged" when the user had found it during review, not the scanner. It
also said "both were flagged as needing review" when one ticket had asked for
an action. "Is this 100% correct?" caught both. Shortening merges sources,
so run the claims pass again on the *final* text: for each "X did/flagged/said
Y", name where it came from. Show the draft in chat before writing it to
someone else's ticket.

**A test proves only the claim it covers** (2026-10-27): a changelog line said
a shared library's `http` spans now redact signed-URL secrets, and a test
"proved" it by asserting the one attribute the change touched. A human
reviewer then found the same secret in a second attribute of the same span,
written raw by the instrumentation library. The test was certain to pass
because it checked the change, not the claim. A 5-line scan of *every*
exported attribute for the secret failed on the old code and passed on the
fix. For any "nothing leaks / nothing else changes" claim, assert the
negative over the whole output, and read the library line that writes each
field instead of trusting an option's name.
