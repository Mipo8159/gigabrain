---
name: debug-protocol
description: Structured debugging — reproduce first, state expected vs actual, rank hypotheses, test the cheapest discriminating one, make the smallest fix, prove it. Use whenever Giga reports something broken ("not working", "help me fix this", "still failing", a pasted error or stack trace, "it worked yesterday"), before proposing any fix.
---

# Debug protocol

Fixing before reproducing is how a session turns into five rounds of "still not working".

1. **Restate** in two lines: *expected* vs *actual*, and what changed since it
   last worked (ask only if you can't find out: check `git log/diff`, deps,
   env, running containers).
2. **Reproduce** it yourself with a command you can rerun (curl, test, script,
   log query). If you can't reproduce it, that's the finding; say what's
   different between your environment and Giga's.
3. **Hypotheses**: list 2–4, ranked by how likely they are and how cheap to test. Pick the
   test that *distinguishes* between them, not the one that confirms your
   favourite.
4. **Smallest fix** at the root cause. If the root cause is upstream (config,
   infra, another service), say so; don't patch the symptom.
5. **Prove it**: rerun the step-2 reproduction and show green. Then check one
   neighbour that the fix could have broken.
6. **Leave a trace** if it was non-obvious: a candidate line for `/retro`
   ("pattern: <symptom>, caused by <cause>, fixed by <fix>").

When Giga's report is a bare "help me fix this" plus a paste, still run the
protocol, and end with the CORE.md prompt tip showing what a hypothesis-led
report would have looked like.
