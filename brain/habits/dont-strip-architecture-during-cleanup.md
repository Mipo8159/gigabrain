---
name: dont-strip-architecture-during-cleanup
description: "Cleanup/simplify means deleting dead code only. Ports, adapters, layering, DI and naming conventions stay unless Giga asks; propose structural changes separately. (2026-08-18: deleting port interfaces as 'indirection' got reverted.)"
metadata:
  type: feedback
---

**In short:** a cleanup deletes dead code only. Interfaces, adapters, layers
and naming conventions stay unless Giga asks.

**What happened (2026-08-18):** Giga asked Claude to loop three times over
`auxiliary`: "each time make it simpler… cut any unused or hard to understand
pieces." In pass 1 Claude deleted `IAuthProvider` and `IProfileRepository`
(one implementation each, never swapped, no test fakes), deleted the barrel
(index re-export) files, and renamed the `.adapter.ts` / `.provider.ts` files
as a "confusing" convention.

Giga's correction, verbatim:

> "return all the adapter/repository pattern, I never asken those to be deleted.
> everything hexagonal architecturewise should remain, and the overall could
> shouldbe a sufficient clean code architecture."

**Why:** "simplify" means remove what is *dead*, not what is *structural*.
Ports and adapters (interfaces at the edge, with the real implementations
behind them) are the architecture Giga is practising on purpose, the same
layering as mogulkhan's hexagonal slices, and here understanding matters as
much as output.
An interface with one implementation still earns its place. It states the
contract on one screen without SDK noise, and an adapter that drifts from its
`implements` clause fails to compile. The split (`.repository.ts` holds the
interface, `.adapter.ts` the class) is the standard hexagonal one and was
consistent. Read a convention before rewriting it.

**How to apply:** in a cleanup pass, delete only things that are truly
unreachable: unused exports, dead IAM grants, unreferenced dependencies,
duplicated comments, misleading type annotations. Leave layers, ports,
dependency injection (DI) wiring and naming conventions alone unless asked. If
a structural change looks worthwhile, *propose* it; don't fold it into a
cleanup as "tidying".

Giga kept from the same passes: `ok`/`fail` replacing a `presentation()`
helper that mis-rendered falsy successes, `findErrors`, `PreSignUpTriggerEvent`
from `@types/aws-lambda` instead of a hand-written copy, shorter comments, and a
removed dead `AdminConfirmSignUp` IAM grant. The instinct was right; the scope
was not.

Related: [[giga-wants-argued-recommendations]],
[[auctionize-real-goal-is-transcoding-template]],
[[auxiliary-is-the-app-auctionize-is-legacy]].

**Second case, scope creep in a removal PR (2026-10-30):** a multi-repo
removal PR set also deleted an unused form next to the removed feature,
changed shared test fixtures, removed a public response field, and wrote
~70-line rollbacks that rebuild dropped tables. All of it was arguably dead
code, but none of it was what was asked. Giga: "only remove pieces concerning
to [the removal]. nothing else. otherwise I will have to explain for each of
them, which I can not do." Reverting cost a round per repo.

**Signal:** a removal, deprecation or "cleanup" PR in a shared repo that other
teams review.
**Next time:** before pushing, walk every hunk and ask "does this trace to the
thing being removed?" Anything else (adjacent dead code, fixture tidying,
API-shape changes) goes in a list to Giga as "separate cleanup?", not in the
diff. For migration `down()`, copy the repo's own precedent (here: an empty
"No way back") instead of the most thorough option.
