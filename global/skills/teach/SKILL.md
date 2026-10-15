---
name: teach
description: Teach Giga a technical subject as a visual lesson page (built into ~/.cache, opened via skill learn) - hook question, mental model, hand-drawn SVG mechanism diagrams, steppers with code in sync, live figures to play with, predict-then-reveal quizzes, worked example to own turn, spaced recall and hands-on practice. Use when Giga asks to learn, understand, or be taught a topic ("teach me X", "explain X to the core", "how does X really work", "make a lesson / course / learning page on X").
---

# Teach: turn a subject into understanding

**In short:** one lesson page per subject, built so Giga can *predict* the system's
behaviour, not just recite it. Figures carry the explanation (skill `visual-explainer`
draws them), the teach kit makes them interactive, quizzes make Giga retrieve and apply it,
and practice tickets make Giga use it.

`tutor` is for lab code Giga writes. `teach` builds the understanding first, then hands
over to practice (`bin/practice`) or a `tutor` lab.

## 1. Find out what to teach (one question batch, only if unclear)

- Topic and depth: "first contact", "working knowledge" or "to the core".
- Why now: an upcoming task, an interview, a bug Giga hit. The lesson's examples come from that.
- Current level: check `gigabrain/me/concepts.md` (seen / explain / build / teach).
Skip the questions when the request already says it. Default: "to the core", backend context.

## 2. Get the facts right before drawing them

- If `gigabrain/evals/knowledge/<domain>/BRIEF.md` exists, start there: it holds a
  researched mental model and the traps with sources. Its `NOTES.md` says which traps
  even strong models handle and which they miss: the missed ones get the most page space.
- Otherwise send the `researcher` agent for current docs and versions. A lesson that
  teaches an outdated API is worse than none. Sources stay visible at the end of the page.
- **Fact pass before building:** list every claim the page will make, each with its line in
  the brief or a source. A claim with no source is cut or marked "illustrative".

## 3. Shape the lesson (the order is the point)

Each section teaches one idea and opens with a figure. Plain words; a term the reader may
not know gets a `<dfn data-tip>` on first use.

1. **Hook** (`data-hook`). One concrete question from real work and one picture of the
   problem ("Two consumers read the same partition. Who wins?"). The answer comes later.
2. **Before you start** (`data-prereq`). What the reader needs, what they will be able to
   do after (2–3 outcomes as verbs: predict, choose, debug), time needed, and the review box.
3. **Mental model.** 5 to 8 plain sentences, each with its figure. Draw the mechanism:
   moving parts labelled with verbs (`commits`, `rebalances`, `expires`). One concrete
   analogy per big idea is allowed, then straight to the real system ("in Kafka this is…").
   No reused analogy across sections.
4. **The mechanism, step by step.** 2+ steppers where state visibly changes at every step
   (offsets advance, a lock expires, a transaction commits late). Where code drives it,
   put the real code beside the figure and light the running lines (`data-code`, `data-lines`).
5. **Play with it.** 1+ live figure (`data-sim`): one to three controls the reader feels
   (partition count, TTL, pool size, timeout) and a picture plus a number that react.
   One pure model function; label simplified models "illustrative".
6. **Predict, then reveal.** Before each failure, ask what happens (`data-predict`); the
   real outcome (a figure or stepper) opens only after the guess.
7. **Quizzes test use, not memory.** 8+ in total, spread through the page: scenarios
   ("you see X in production, what is the cause?"), decisions ("which setting, and why?"),
   tracing ("what is the offset after this crash?"). Never definitions or file names.
   Each wrong option is a real misconception, and its `data-why` says why it is tempting
   and why it is wrong. The feedback explains the principle, with a figure where it helps.
8. **Where it breaks.** The traps as small multiples: the same mini diagram per failure
   mode, with the wrong code, the symptom in production and the fix.
9. **Worked example → your turn.** One fully worked example, then the same shape with
   gaps (`data-fill`) or steps to order (`data-order`). Practice tickets
   (`bin/practice start <domain/case>`) are optional extras, not the main path.
10. **Recall** (`data-recall`). 3+ quizzes that mix the whole lesson, answered without
   scrolling up, the review box (it schedules retries at 1, 3, 7, 21 and 60 days),
   at most 7 lines to remember, the glossary (`data-glossary`) and the sources.
11. **Exams** (added by the server, not written in the page). Every topic gets five variants
   in `evals/knowledge/<topic>/exams/v1..v5.json` (contract `kit/EXAMS.md`, checker
   `bin/check-exam`). `bin/learn serve` appends them as the lesson's last section. A new
   lesson isn't done until its exams exist and pass. Scenario questions on structure and
   trade-offs at scale; short code snippets are fine when the question is about what the code
   does to the system. Practice tickets are optional now: Giga does long coding in real projects.

## 4. Build and check the page

- Draw with skill `visual-explainer` (Paper register by default; its tokens, figure rules,
  words rules and polish pass). For lessons, these teach rules win where the two differ
  (the analogy rule, the section count).
- Wire interactions with the **teach kit**: read `kit/CONTRACT.md`, copy parts from
  `kit/example.html` (a small lesson that passes). Write no stepper, quiz, tooltip or
  section-map code of your own; the kit has them. Write only the `teachSims` functions.
- **Phones:** SVG labels must render at 10.5 px or more at 390 px (the checker measures it).
  Put each wide figure's SVG directly in a `.frame`: on phones the kit gives it a 40rem
  minimum and a sideways scroll. A figure drawn narrow enough to scale gets `class="fit"`.
- **Offline:** no scripts, styles or images from the network; Google Fonts only, with a
  fallback stack. A library, if one is ever needed, is inlined in the source.
- Write the source to `~/.cache/gigabrain/learn/src/<topic>.html` (never into a repo), then:
  `bin/learn assemble <topic> <that source>` → `bin/check-lesson <the printed path>
  --shots <dir> --figs`. Fix and re-run until it reports PASS. Then look at every capture
  (`--figs` saves each figure, light and dark, steppers at their last step): readable labels,
  nothing overlapping or clipped, both schemes.
- Then `bin/learn stamp <topic> [Title]` (records the brief and kit it was built from) and
  `bin/learn open <topic>`. Publish as an Artifact only when Giga asks.

## 5. After the lesson

- Update `gigabrain/me/concepts.md`: the topic moves to "seen". It moves to "explain"
  after Giga answers the quiz well in their own words, and to "build" after a practice
  ticket passes.
- If a question kept tripping Giga, note it for `/retro` as a coaching signal.

## Rules

- Correct beats pretty. Every claim on the page traces to a doc, a brief or a run.
- One idea per figure, a verb on every arrow, state shown by shape and position, not
  colour alone.
- Never pad. A lesson that teaches 4 things well beats one that lists 20. The checker's
  counts are a floor, not a goal.
- To change how every lesson works, change the kit (`kit/kit.js`, `kit/kit.css`) and its
  contract; `bin/learn list` then marks every page stale (kit changed).
