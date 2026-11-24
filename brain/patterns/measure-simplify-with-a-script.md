---
name: measure-simplify-with-a-script
description: "Make it simpler/sharper" gets a baseline script first (words, sentence length, figure count, structure rule), and coverage targets count unique items, not totals
metadata:
  type: pattern
---

When asked to make a page, doc or lesson "simpler" or "sharper", write a small measuring
script **before** editing, run it on the current version, and set the done-line from its
numbers: prose words cut by ≥ X %, average sentence ≤ N words, figure count ≥ M, and a
structure rule (for example, "every section opens with a figure"). Rerun the same script
on the result and show a before/after table.

**Why:** 2026-11-24, a lesson rewrite: the baseline (2,317 words, 10 figures, 7 sections
without an opening figure) turned "simpler" into a checkable bar, and the result was
measured (−44 % words, 15 figures, 0 sections without a figure). But the target "60+
citations" was missed (54) only because duplicate citations of the same line were removed;
both versions cited the same 51 unique lines. The count was the wrong measure; coverage
of unique sources was the right one.

**How to apply:**
- Keep the measurer next to the artifact and run it on both versions (save the old one as `.v1`).
- Exclude hidden or proof-only markup (source tags, code, SVG) from the prose count.
- For proof that must survive a cut (citations, test cases, requirements), compare the
  **set** of unique items before and after (`comm -23 old new` is empty), not a total.
- When proof markup is hidden behind a toggle, check the text still reads with it hidden:
  move punctuation before the hidden tag and drop labels such as "Source:" that would
  dangle.

**Signal:** "simpler", "sharpen", "cleaner", "less noisy", "easier to read" on an existing artifact.
**Next time:** first tool call is the measurer on the current version; the done-line quotes its numbers.
