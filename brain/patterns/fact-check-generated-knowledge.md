---
name: fact-check-generated-knowledge
description: "A mechanical checker can't see facts: generated lessons, quizzes and briefs need a docs fact-check aimed at what the authors took from memory or marked least sure, plus a grep for retired services. 2026-10-15: 1,225 exam questions passed the checker with 3 wrong keys inside."
metadata:
  type: feedback
---

**In short:** when agents generate knowledge content (exam questions, lessons,
briefs), make each author list the facts it took from memory and the items it
is least sure of, then fact-check *those* against official docs first. A
random sample comes second.

**Why:** 2026-10-15, 50 exam variants (1,225 questions) written by 14 background
agents. `bin/check-exam` passed every file (counts, keys, giveaways, repeats)
while these were inside:
- 2 keyed answers were outdated: Snowball Edge closed to new customers on
  2025-11-07. Three authors had *flagged* Snowball as unsure; two still keyed it.
- 1 wrong key (OpenTelemetry ESM setup) and ~10 false claims in explanations
  (Kafka quotas per topic, S3 RTC "99.99%" in 6 places, Postgres failover-slot
  prerequisites). All came from the authors' "least sure / from memory" lists
  or from a grep for one bad fact across all variants.
- Where docs conflicted (Node `keepAliveTimeout` 5 s vs 65 s), running the
  installed runtime settled it in one command.

**How to apply:**
- In the author brief, require a hand-back list: facts not in the source brief,
  and the 3 items it is least sure of. Tell authors to drop, not key, anything
  they are unsure is still available.
- Fact-check those lists with the `researcher` (official docs, URL per claim),
  then a ~10% sample. When one fact is wrong, grep every file for it.
- Record findings in the topic's source brief (`EXAM.md`/`BRIEF.md`), so a
  rebuild doesn't repeat them.
- Prefer executing the thing (a compiler, a runtime default) over arguing from docs.

**Signal:** "generate N questions/lessons/notes on X" with a checker that only
validates shape.
**Next time:** author brief asks for the memory-facts and least-sure lists;
the researcher checks them before handover.

Related: [[shared-kit-and-checker-before-fan-out]], [[measure-before-writing-a-knowledge-skill]].
