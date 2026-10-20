---
name: read-the-gate-before-guessing
description: "When a quality gate, CI bot or dashboard is unreadable to Claude (403, SSO, blocked browser) but Giga can see it, ask Giga to paste the exact finding in the same turn; don't ship guessed fixes or predict the bot's behaviour without reading its workflow."
metadata:
  type: feedback
---

**In short:** a failing gate you can't read is a question for Giga, not a puzzle
to guess. Ask for the exact text of the finding first, then fix only that.

**Why:** 2026-10-21, a work PR. The SonarQube gate failed with "1 new issue".
Its API returned 403 and the browser extension was blocked by org policy. Claude
ran a local linter and then guessed twice: it removed an unused import, then
renamed a realistic-looking fake token. Each guess got its own commit and push,
and the gate stayed red. Giga then pasted the real finding (a `node:` import
prefix rule), which was fixed in one line. The two guesses later had to be
squashed and force-pushed (see [[giga-commits-are-mine-to-make]]).
In the same session, Claude stated as fact that a force-push would make the CI
review bot repost its comment. The bot's workflow, which was readable in the
repo, has a "nothing to report" path for an unchanged diff, and it posted
nothing.

**How to apply:**
- If the gate's output can't be read in two tries, ask straight away: "Paste the
  issue text from the dashboard (file, line, rule)". Keep any local scan going
  in parallel, but don't push it as the fix.
- Before predicting what a bot or CI job will do, read its workflow file or the
  run log. If you haven't, say "probably" and name what would confirm it.
- When a CI test step shows only an exit code (junit reporter), download the
  test-results artifact to get the failing test's name before calling it a
  flake.

**Signal:** 403/blocked on a gate, "1 new issue" with no details, or a sentence
starting "this will…" about a bot.
**Next time:** one line to Giga asking for the paste, before the first speculative commit.
