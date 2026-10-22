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
