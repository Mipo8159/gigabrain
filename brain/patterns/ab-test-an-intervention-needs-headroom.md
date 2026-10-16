---
name: ab-test-an-intervention-needs-headroom
description: "Before A/B-testing a prompt hook, skill wording or rule: confirm the baseline isn't already at ceiling, prove the intervention actually fired, and keep one held-out case so a wording fix isn't just teaching to the test."
metadata:
  type: reference
---

**In short:** an A/B test can only show a win if there is room to win, the
change actually ran, and the test isn't the training set.

**Why:** 2026-10-17, forced-eval hook (after scottspence.com, Feb 2026)
against gigabrain's skill triggers:
- **Ceiling.** The existing trigger suite already scored 9/9, so it could
  never show a gain. Claude wrote 10 harder cases (7 indirect triggers and
  3 that must load nothing). Result: plain 27/30, forced 27/30. A tie, so
  the hook was not installed. Cost about $5.
- **Did it fire?** A tie can also mean the hook never ran. One run with
  `--keep-temp` showed a `hook_success` record carrying the hook's text in
  the eval transcript, so the tie was real.
- **Held out.** Both arms failed one case (a sign-off should trigger
  `/retro`). Adding sign-off phrases to the description fixed it 3/3, but
  the case's own words were now in the description. A second phrasing that
  is not in the description also passed 3/3, so the fix generalises.

**How to apply:**
1. Run the baseline first. If it's at or near 100%, add harder cases before
   spending on the intervention arm.
2. Prove the intervention ran (a trace or transcript record), not just that
   it was configured.
3. When you change wording because of a failing case, add one held-out case
   phrased differently and require it to pass too.
4. Keep the negatives (cases that must not fire) in both arms. An
   intervention that over-fires fails even if it wins on triggers.

**Signal:** "does X make it better?", a new hook, rule or description tuned
by evals, a CORE wording change.
**Next time:** the A/B script prints the baseline score before running the
second arm, and stops if the baseline is ≥ 95%.

Related: [[import-knowledge-on-demand]] (a perfect plain baseline means no
skill is needed), [[fact-check-generated-knowledge]].
