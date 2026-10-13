---
name: teach
description: Teach Giga a technical subject as a visual lesson page (built into ~/.cache, opened via skill learn) - mental model, hand-drawn SVG mechanism diagrams, step-through animations, predict-then-reveal quizzes and hands-on practice. Use when Giga asks to learn, understand, or be taught a topic ("teach me X", "explain X to the core", "how does X really work", "make a lesson / course / learning page on X").
---

# Teach: turn a subject into understanding

**In short:** one lesson page per subject, built so Giga can *predict* the system's
behaviour, not just recite it. Figures carry the explanation (skill `visual-explainer`
does the drawing), quizzes make him retrieve it, and practice tickets make him use it.

`tutor` is for lab code Giga writes himself. `teach` builds the understanding first,
then hands over to practice (`bin/practice`) or a `tutor` lab.

## 1. Find out what to teach (one question batch, only if unclear)

- Topic and depth: "first contact", "working knowledge" or "to the core".
- Why now: an upcoming task, an interview, a bug he hit. The lesson's examples come from that.
- Current level: check `gigabrain/me/concepts.md` (seen / explain / build / teach).
Skip the questions when the request already says it. Default: "to the core", backend context.

## 2. Get the facts right before drawing them

- If `gigabrain/evals/knowledge/<domain>/BRIEF.md` exists, start there: it holds a
  researched mental model and the traps with sources. Its `NOTES.md` says which traps
  even strong models handle and which they miss.
- Otherwise send the `researcher` agent for current docs and versions. A lesson that
  teaches an outdated API is worse than none. Cite the sources on the page.

## 3. Shape the lesson (the order is the point)

1. **The question.** One sentence and one picture of the problem the subject solves.
   ("Two consumers read the same partition. Who wins?")
2. **The mental model.** 5 to 8 plain sentences, each with a figure. Draw the
   mechanism: the moving parts, labelled with verbs (`commits`, `rebalances`, `expires`).
3. **The mechanism, step by step.** At least one stepper the reader clicks through, where
   state visibly changes (offsets advance, a lock expires, a transaction commits late).
4. **Predict, then reveal.** Before showing a failure, ask what happens. Multiple choice
   with one plausible wrong answer per common misconception. The answer explains *why*
   with a figure, not just which option was right. At least 5 per lesson, spread through it.
5. **Where it breaks.** The traps as small multiples: the same mini diagram per failure
   mode, with the wrong code, the symptom in production and the fix.
6. **Hands-on.** Link the matching practice tickets: `bin/practice start <domain/case>`.
   If none exist, give one small exercise with a checkable outcome.
7. **What to remember.** At most 7 lines. Spaced review: say "come back to the quiz in
   3 days" and list which questions to retry.

## 4. Build and check the page

- Draw it with skill `visual-explainer` (its tokens, figure rules and words rules).
  One self-contained HTML file. Works offline and in dark mode, readable on a phone.
- Markup contract (the checker clicks these): a stepper is a container with
  `data-stepper` holding a `data-step="next"` button that changes what is shown; a quiz is
  a `data-quiz` container with `data-option` buttons and one `data-feedback` element
  (hidden until an option is clicked, then explains the answer in 20+ characters).
- Interactions use plain JS, no build step. Quiz state may use `localStorage`, wrapped
  in try/catch, so the page still works without it.
- Save to the cache, never into a repo: the path `gigabrain/bin/learn path <topic>` prints
  (`~/.cache/gigabrain/learn/<topic>.html`). Skill `learn` lists and opens these pages.
- Prove it renders: `bin/check-lesson <that path>`. It must report no console
  errors, at least 4 figures with SVG, at least 1 working stepper and at least 5 quizzes
  that react to a click. Fix and re-run until it passes.
- Then `bin/learn stamp <topic> [Title]` (records the brief it was built from) and
  `bin/learn open <topic>`. Publish as an Artifact only when Giga asks.

## 5. After the lesson

- Update `gigabrain/me/concepts.md`: the topic moves to "seen". It moves to "explain"
  after Giga answers the quiz well in his own words, and to "build" after a practice
  ticket passes.
- If a question kept tripping him, note it for `/retro` as a coaching signal.

## Rules

- Correct beats pretty. Every claim on the page traces to a doc, a brief or a run.
- One idea per figure, a verb on every arrow, state shown by shape and position, not
  colour alone.
- Never pad. A lesson that teaches 4 things well beats one that lists 20.
