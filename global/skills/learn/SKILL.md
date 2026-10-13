---
name: learn
description: Show Giga's lesson catalogue and open the chosen lesson in the browser, building it on the fly if it isn't cached. Use when Giga types /learn, or asks "what can I learn", "open the kafka lesson", "show my lessons".
---

# Learn: pick a lesson, open it in the browser

**In short:** nothing is stored in the repo as HTML. The repo keeps the sources
(`evals/knowledge/<topic>/BRIEF.md` plus practice tickets). Pages are built by skill `teach`
on first request, cached in `~/.cache/gigabrain/learn/`, and rebuilt when the brief changes.

Helper: `~/projects/gigabrain/bin/learn` (`list`, `open <topic>`, `path <topic>`, `stamp <topic>`).

## Steps

1. **No topic given** (`/learn` alone): run `bin/learn list` and show it as a short numbered
   table (topic, practice tickets, page state). Say any other subject also works. Then stop
   and wait for the pick.
2. **Topic given or picked:** run `bin/learn open <topic>`.
   - Exit 0: the page is open in the browser. Reply in one line with the topic and
     `bin/practice list` for its tickets. Done.
   - Exit 3 (`not built` or `stale`): say it takes about 20–40 minutes to build and check,
     then build it in the background (step 3) so the session stays free.
3. **Build:** follow skill `teach` with these overrides.
   - Facts come from the topic's `BRIEF.md` and `NOTES.md`. For a topic with no brief, the
     `researcher` agent writes the facts first, with cited sources.
   - Save to the path `bin/learn path <topic>` prints, not into any repo.
   - `bin/check-lesson <that path>` must PASS. Then run `bin/learn stamp <topic> [Title]`,
     then `bin/learn open <topic>`.
4. **On a phone or to share:** only when Giga asks, publish the cached page as a private
   Artifact (Artifact tool) and give the link.

## Rules

- Never write lesson HTML into gigabrain or a project repo. The cache is disposable: deleting
  it only costs a rebuild.
- A stale page still opens if Giga wants it now (`bin/learn open <topic> --anyway`). Say it is
  stale and offer the rebuild.
