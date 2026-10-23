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

**Second pass, 2026-10-16:** the bank above (already targeted-checked) got a full
per-question pass: 9 checker agents on disjoint files, each logging id | verdict |
source. 1,112 questions checked, **61 more fixed (5.5%)**. Most were facts that
changed after the model's training: Database Savings Plans (Dec 2025), 50 TB S3
objects, SNS 1 MiB opt-in (Sept 2026), Nest 12 now current, Vite 8 Oxc. A few
were wrong maths (gp2 IOPS). An independent verifier confirmed 19/19 sampled fixes.
So the targeted pass catches flagged doubts; only a full pass catches what no author doubted.

**Third pass, 2026-10-17 (re-pin to a new major):** 3 checkers on disjoint
files ran 119 questions against Nest 12 / current AWS: **28 changed (24%)**,
and no keyed answer flipped. The fixes were wrong symptoms, stale explanations
and dead docs anchors. A row the 10-16 docs-only pass had marked "confirmed"
(the esbuild no-metadata symptom) was refuted by running code: Nest boots and
injects `undefined`. Each checker listed cross-file hits instead of editing
them, and the lead relayed each hit to the file's owner. A verifier then
confirmed 9/9 sampled fixes.

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

Related: [[shared-kit-and-checker-before-fan-out]], [[import-knowledge-on-demand]].

**Code-derived cards (2026-10-23):** for knowledge built from repos (one card per
repo: purpose, callers, deploy, activity), a per-item pipeline of author → checker
works. The checker picks the 10 claims most likely wrong (status, callers,
counts, deploy target) and re-runs the command or grep behind each. In a 2-card
smoke run it fixed 4 of 24 claims (17%), all counts or omissions taken from a
single `gh` call. Measure the wrong rate on a smoke run before fanning out to ~100 items.

**Also for docs Claude writes itself (2026-10-20):** a workspace CLAUDE.md drafted
while exploration agents were still running carried two claims from memory, both
wrong (an infra repo called "Terraform" was mostly CloudFormation; "every service
has a compose -test target" held for 3 of 12). The agents' reports caught both.
Write config/docs after the evidence lands, or mark each unverified line and
re-check it when the reports arrive.
