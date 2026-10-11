---
name: dont-strip-architecture-during-cleanup
description: "Cleanup/simplify means deleting dead code only. Ports, adapters, layering, DI and naming conventions stay unless Giga asks; propose structural changes separately. (2026-08-18: deleting port interfaces as 'indirection' got reverted.)"
metadata:
  type: feedback
---

The user asked me to loop three times over `auxiliary`, "each time make it
simpler… cut any unused or hard to understand pieces." In pass 1 I deleted
`IAuthProvider` and `IProfileRepository` — single-implementation interfaces,
never substituted, no tests to fake them — plus the barrel files, and renamed
the `.adapter.ts` / `.provider.ts` files because I judged the convention
confusing.

Their correction, verbatim:

> "return all the adapter/repository pattern, I never asken those to be deleted.
> everything hexagonal architecturewise should remain, and the overall could
> shouldbe a sufficient clean code architecture."

**Why:** "simplify" means remove what is *dead*, not what is *structural*. Ports
and adapters are the architecture they are deliberately practising — the same
layering as mogulkhan's hexagonal slices — and the point of this project is
comprehension as much as output (see
[[auctionize-real-goal-is-transcoding-template]]). An interface with one
implementation still earns its place: it states the contract in one screen
without SDK noise, and an adapter drifting from its `implements` clause fails to
compile. I was also wrong that `.repository.ts`-holds-the-interface /
`.adapter.ts`-holds-the-class was confusing — it is the standard hexagonal split
and it was already consistent. Read the convention before rewriting it.

**How to apply:** in a cleanup pass, delete only genuinely unreachable things —
unused exports, dead IAM grants, unreferenced deps, duplicated comments,
misleading type annotations. Leave layering, ports, DI wiring and naming
conventions alone unless asked. If a structural change looks worthwhile,
*propose* it and keep working; do not fold it into a cleanup and present it as
tidying.

What they kept from the same passes, unprompted: `ok`/`fail` replacing a
`presentation()` helper that mis-rendered falsy successes, `findErrors`,
`PreSignUpTriggerEvent` from `@types/aws-lambda` instead of a hand-rolled copy,
trimmed comment prose, and a dead `AdminConfirmSignUp` IAM grant. So the
instinct was right; the scope was not.

Related: [[giga-wants-argued-recommendations]],
[[auctionize-real-goal-is-transcoding-template]],
[[auxiliary-is-the-app-auctionize-is-legacy]].
