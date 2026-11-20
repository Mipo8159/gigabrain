---
name: edit-prompts-behind-baseline-evals
description: "Restyling many skills/agents at once: baseline the evals before the first edit, encode the target style as a lint shown red first, split edits across agents by disjoint files, then rerun the evals and read the graded output, not only the score."
metadata:
  type: feedback
---

**Rule:** a bulk rewrite of prompts (skills, agents) is a refactor with no
compiler. Before the first edit: run the trigger and output evals for a
baseline, and turn the target style into a lint that fails on the old tree.
Edit in parallel batches that own disjoint files, lint after each, then rerun
the same evals and open the graded reports.

**Why:** on 2026-11-20 gigabrain's 15 skills and agents were restyled on an
outside team's conventions. The lint went 32 FAIL → 0. The scores matched the
baseline (triggers 9/9, intent eval 7/8 and 8/8), but one report had a sentence
before its `VERDICT:` line and the grader parsed the word "is". The score hid a
format drift that the template text did not explain. One added sentence ("the
report starts with these lines; no prose before them") restored it. A
background reviewer then found 13 more issues the lint passed, including a
relabelled status vocabulary and a moved safety rule.

**How to apply:**
- Evals that load agents through live symlinks must finish their baseline
  before any agent file changes.
- State output position explicitly in templates that a script parses.
- Restructure, never drop: a reviewer compares each file against
  `git show HEAD:<path>` for lost rules, gates and tokens.
- Pinned upstream content changes only through its own edit pipeline.

**Signal:** "adjust all skills to X style", "rewrite the agents", any edit
touching more than 3 prompt files.
**Next time:** baseline evals + red lint first, then forks per file batch.

Related: [[a-test-must-be-able-to-fail]], [[skill-allowed-tools-grants-not-restricts]].
