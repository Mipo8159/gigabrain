---
name: dont-strip-architecture-during-cleanup
description: "Cleanup/simplify means deleting dead code only. Ports, adapters, layering, DI and naming conventions stay unless Giga asks; propose structural changes separately. (2026-08-18: deleting port interfaces as 'indirection' got reverted.)"
metadata:
  type: feedback
---

**In short:** a cleanup deletes dead code only. Interfaces, adapters, layers
and naming conventions stay unless Giga asks. A removal PR removes only the thing
being removed.

**Why (2026-08-18):** asked to loop over a personal lab "making it simpler… cut any
unused or hard to understand pieces", Claude deleted two single-implementation port
interfaces, the barrel files, and renamed the `.adapter.ts` / `.provider.ts`
convention. Giga's correction: "return all the adapter/repository pattern, I never
asken those to be deleted. everything hexagonal architecturewise should remain".
Ports and adapters are the architecture Giga is practising on purpose. An interface
with one implementation still earns its place: it states the contract on one screen,
and an adapter that drifts from its `implements` clause fails to compile. Read a
convention before rewriting it. (Giga kept the real fixes from the same passes: a
helper that mis-rendered falsy values, an SDK type instead of a hand-written copy, a
dead IAM grant. The instinct was right; the scope was not.)

**Second case (2026-10-30, a multi-repo removal):** the PRs also deleted an adjacent
unused form, changed shared test fixtures, removed a public response field, and wrote
~70-line rollbacks rebuilding dropped tables. Giga: "only remove pieces concerning to
[the removal]. nothing else. otherwise I will have to explain for each of them".
Reverting cost a round per repo.

**How to apply:**
- In a cleanup pass, delete only what is truly unreachable: unused exports, dead IAM
  grants, unreferenced dependencies, duplicated comments, misleading type annotations.
- Leave layers, ports, dependency injection wiring and naming conventions alone unless
  asked. A worthwhile structural change is *proposed* separately, never folded into a
  cleanup as "tidying".
- Removal/deprecation PRs in shared repos: before pushing, walk every hunk and ask
  "does this trace to the thing being removed?". Anything else (adjacent dead code,
  fixture tidying, API-shape changes) goes to Giga as "separate cleanup?", not in the diff.
- For migration `down()`, copy the repo's own precedent (e.g. an empty "No way back")
  instead of the most thorough option.

**Signal:** "simplify", "clean up", or a removal PR in a shared repo other teams review.

Related: [[giga-wants-argued-recommendations]], [[removal-inventory-is-one-sweep-not-a-drip]].
