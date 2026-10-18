---
name: shared-kit-and-checker-before-fan-out
description: Before N agents build N similar artifacts, build the shared component kit and a strict mechanical checker, prove the checker can fail, review the kit, and keep a re-inject step so kit fixes mid-run cost a rerun, not a rebuild.
metadata:
  type: project
---

**In short:** when one request becomes many parallel builds of the same kind
(lessons, pages, services, fixtures), the shared parts and the acceptance check
come first. A bug in either is multiplied by N.

**Why:** 2026-10-14, rebuilding 9 lesson pages with 9 background agents.
- A shared kit (stepper, quiz, sim, glossary, review JS/CSS) plus a markup
  contract and an example page meant agents wrote content, not widgets.
- The background reviewer, run while the first agents were already building,
  found 2 blockers that would have shipped in all 9 pages: every quiz answer
  was visible before answering (`[hidden]` loses to an author rule such as
  `figure{display:grid}`; fix `[hidden]{display:none!important}`), and the
  checker could not notice, because it only looked *after* the click.
- The checker had 3 more false passes: "Next changed the stepper" was always
  true (counters and `disabled` change every step); an empty explanation passed
  "feedback ≥ 20 chars" (the kit's own verdict text filled it); a predict quiz
  with no reveal passed. Each fix was proven by a deliberately broken page
  going red.
- The kit was inlined at assemble time from kept sources, so every kit fix
  mid-run cost one `assemble` + check per page, not a rebuild. 6 builder
  reports (wrapping, list syntax, stepper-in-reveal crash, fold-only
  screenshots) became kit or checker fixes that all later builders got free.

**How to apply:**
- Build kit + contract + one small passing example first; prove it with the
  checker, and prove the checker on 2–3 broken copies (it must go red).
- Assert the state *before* interaction (hidden, disabled, empty), not only after.
- Judge interactive state on what the reader sees (parts shown, caption, lit
  lines), never on raw HTML that the framework changes anyway.
- Keep sources plus an inject step; stamp from what the artifact embeds
  (hash in the output), not from the current kit.
- Start the reviewer on the kit at the same moment as the first builders, and
  tell running builders when the rules change.
- Name each builder's own work dir in its prompt ([[steer-parallelism-and-agent-roles]]).
- Before tightening a checker rule mid-run, run it on content that already passes.
  2026-10-15: a stricter "definition question" rule flagged normal "What is the MOST
  likely cause?" stems, and 5 writers reworded good questions to dodge it.

Related: [[test-guards-against-innocent-lookalikes]] (prove a checker can fail).

**Signal:** "do this for all of my X", or a plan that launches 3+ agents
producing the same kind of artifact.
**Next time:** kit + checker + broken-copy proofs + background review before
(or alongside) the first builder; one re-inject command for mid-run fixes.
