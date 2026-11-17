---
name: fact-check-generated-knowledge
description: "A mechanical checker can't see facts: generated lessons, quizzes and briefs need a docs fact-check aimed at what the authors took from memory or marked least sure, plus a grep for retired services. 2026-10-15: 1,225 exam questions passed the checker with 3 wrong keys inside."
metadata:
  type: feedback
---

**In short:** when agents generate knowledge content (exam questions, lessons,
briefs, repo cards), make each author list the facts it took from memory and the
items it is least sure of, then fact-check *those* against official docs or the
code first. A random sample comes second; a full pass catches what no author doubted.

**Measured wrong rates (all after a shape checker passed):**
- 2026-10-15, 1,225 exam questions by 14 agents: 2 outdated keys (a retired service),
  1 wrong key, ~10 false explanations, all found via the authors' "least sure" lists
  or a grep for one bad fact across all files.
- 2026-10-16, full per-question pass, 9 checkers on disjoint files: 61 of 1,112 fixed
  (5.5%), mostly facts that changed after the model's training. Verifier: 19/19 fixes held.
- 2026-10-17, re-pin to a new major: 28 of 119 changed (24%). A row a docs-only pass
  had "confirmed" was refuted by running code.
- 2026-10-23/29, code-derived repo cards (author → checker): smoke run 4/24 claims
  wrong (17%), at scale 69/419 (16.5%). Error classes repeated exactly: counts with no
  command behind them, line ranges, paraphrased auth exemptions, facts read from a
  local working tree on a feature branch. "What calls what" was almost always right.
- 2026-11-02, two research agents on an internal platform: each had one confident
  wrong claim (a tool count; a ticket title read as what its diff did).

- 2026-11-13, a lesson step said "add X to the workspace config", but X had been
  there since the first scaffold commit. An absence claim was made from memory and
  never grepped. Found only when a later video re-checked the same fact.
- 2026-11-17, a deploy lesson described one IAM role's permissions with statements
  that belonged to a different role ~300 lines earlier in the same template. The
  lesson's own checker passed because its absence checks grepped the whole file.
  Found only when Giga asked "where have you seen this, how are you sure?"; 3 of 8
  videos were re-rendered and the size of an infra ask grew.

**How to apply:**
- In a file holding many resources (an IAM template, a compose file, a CI config),
  first find the named block's line range, then read and grep only inside it. A
  checker's presence and absence checks are bounded to that range too, and the
  claim cites the range ("role block 1491–1789"), not a single line.
- Absence claims ("the repo lacks X", "nothing does Y") cite the grep or `git show`
  that found nothing. Presence is easier to verify than absence, so absence is
  where confident errors hide.
- In the author brief, require a hand-back list: facts not in the source brief, and
  the 3 items it is least sure of. Authors drop, not key, anything they are unsure
  is still available.
- Fact-check those lists with the `researcher` (URL per claim), then a ~10% sample.
  When one fact is wrong, grep every file for it. Checkers on disjoint files list
  cross-file hits for the owner instead of editing them.
- Prefer executing the thing (a compiler, a runtime default) over arguing from docs.
- Record findings in the topic's source brief (`EXAM.md`/`BRIEF.md`) so a rebuild
  doesn't repeat them.
- Code-derived content: read only through `git show origin/<default>:<path>`, every
  count cites its command (or is written "~N (inferred)"), quote guard conditions
  verbatim, read the diff not the ticket title. Measure the wrong rate on a 2-item
  smoke run before fanning out; plan around the usage window, not wall-clock (~6M
  subagent tokens ran in 30 min).
- Docs Claude writes itself (a workspace CLAUDE.md, a lesson brief): write after the
  evidence lands, or mark each unverified line. For a spec or API with numbered
  revisions, ask "what is the newest revision, and what did it remove?" first
  (2026-10-28: half a brief taught a lifecycle the newest revision had removed).

**Signal:** "generate N questions/lessons/notes/cards on X" with a checker that only
validates shape.
**Next time:** author brief asks for the memory-facts and least-sure lists; the
researcher checks them before handover.

Related: [[shared-kit-and-checker-before-fan-out]], [[import-knowledge-on-demand]].
