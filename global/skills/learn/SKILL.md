---
name: learn
description: Show Giga's lesson and exam catalogue, open the chosen lesson (with its exams at the end) or an exam in the browser, building the lesson on the fly if it isn't cached, and plan the next study step from the exam log. Use when Giga types /learn, or asks "what can I learn", "open the kafka lesson", "give me an exam", "how did I do", "what should I study next".
---

# Learn: pick a lesson, open it in the browser

**In short:** nothing is stored in the repo as HTML. The repo keeps the sources
(`evals/knowledge/<topic>/BRIEF.md`, practice tickets, and five exam variants in `exams/v1..v5.json`).
Pages are built by skill `teach` on first request, cached in `~/.cache/gigabrain/learn/`, and rebuilt
when the brief changes. A local server (`bin/learn serve`, 127.0.0.1:47615, started on demand) serves
each lesson with an **Exams** section at the end and runs the exams; every finished attempt is appended
to `me/exam-log.jsonl`. `aws-associate` has exams only (SAA-C03 practice, 5 × 65 questions).

Helper: `~/projects/gigabrain/bin/learn` (`list`, `open <topic>`, `exam <topic> [n]`, `serve`, `stop`,
`path <topic>`, `assemble <topic> <src>`, `stamp <topic>`). Exam checker: `bin/check-exam <topic>`.

Giga's focus (2026-10-15): structure and approach at global distributed scale; short code snippets
with questions are welcome, day-long coding tickets are not (those happen in real projects).

## Steps

1. **No topic given** (`/learn` alone): run `bin/learn list` and show it as a short numbered
   table (topic, exams, page state, last exam score from `me/exam-log.jsonl`). Say any other subject also works. Then stop
   and wait for the pick.
2. **Topic given or picked:** run `bin/learn open <topic>`.
   - Exit 0: the page is open in the browser (exams are at its end). Reply in one line with
     the topic and `bin/learn exam <topic>` for the next untaken variant. Done.
   - Exit 3 (`not built` or `stale`): say it takes about 20–40 minutes to build and check,
     then build it in the background (step 3) so the session stays free.
3. **Build:** follow skill `teach` with these overrides.
   - Facts come from the topic's `BRIEF.md` and `NOTES.md`. For a topic with no brief, the
     `researcher` agent writes the facts first, with cited sources.
   - Write the source to `~/.cache/gigabrain/learn/src/<topic>.html`, not into any repo, then
     `bin/learn assemble <topic> <that source>` (inlines the teach kit into the cached page).
   - `bin/check-lesson <the printed path>` must PASS. Then run `bin/learn stamp <topic> [Title]`,
     then `bin/learn open <topic>`.
4. **Exam asked for** ("exam", "test me", `/learn exam aws-associate`): `bin/learn exam <topic> [n]`.
   No exams for the topic yet: write them with the contract in `global/skills/teach/kit/EXAMS.md`
   (background agent, `bin/check-exam <topic>` must pass).
5. **"How did I do" / "what next":** read `me/exam-log.jsonl`. Per topic: last score per variant,
   the weakest domain, and the missed question ids (look up their stems and `explain` in the
   exam JSON). Recommend one next step: re-read that lesson section, take the next variant, or
   a short focused quiz on the missed principle. Update `me/concepts.md` only with evidence
   (a passed exam in exam mode supports "explain" for the concepts it covers).
6. **On a phone or to share:** only when Giga asks, publish the cached page as a private
   Artifact (Artifact tool) and give the link.

## Rules

- Never write lesson HTML into gigabrain or a project repo. The cache is disposable: deleting
  it only costs a rebuild.
- Exam JSON is source data (it lives in the repo); exam results are Giga's record (`me/`).
- A stale page still opens if Giga wants it now (`bin/learn open <topic> --anyway`). Say it is
  stale and offer the rebuild.
