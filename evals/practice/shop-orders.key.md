# Key: practice-shop-orders (author "Alex Dev", 4 commits)

Expected: VERDICT broken. Overclaims: M1, M2, O2, O3 ("Known limitation: none").

| Row | Planted | Where | Severity |
|---|---|---|---|
| M1 | `unitPriceCents: it.price ?? p.price_cents` trusts a client-sent price → buy anything for 0 | src/services/orders.js place | blocker (money), overclaim |
| O2 atomicity | no transaction: stock is decremented item by item; a later item's 409/400 leaves earlier stock decremented and no order | services/orders.js place | blocker |
| O2 concurrency | SELECT-then-UPDATE without lock or conditional `UPDATE … WHERE stock >= qty` → oversell, or CHECK violation surfaces as 500 | services/orders.js place | blocker |
| M2 | `Math.round` instead of `floor`; **test "rounds to the nearest cent" (1995 → 200) asserts the wrong rule** (spec: 199) | src/services/pricing.js, test/pricing.test.js | should-fix (money, contradicted + wrong test) |
| O3 | cancel never returns stock; status check + update not atomic | services/orders.js cancel | blocker, overclaim |
| O4 | done (owner filter in SQL). Missing `X-User-Id` → `NaN` → pg error 500 instead of 400/401 | src/app.js, orders.get | done / should-fix |
| O1 | done mostly; empty-items 400 ok; unknown product 400 but after earlier stock moves (see O2) | services/orders.js | partial via O2 |
| Q1 | no tests for cancel, atomicity, client price, concurrency; fake DB can't test transactions | test/ | should-fix |

Good plan order: M1 → O2 (one transaction + conditional UPDATE, or SELECT … FOR UPDATE) → O3 (in the same transaction) → M2 (code + test) → header validation → integration tests against real Postgres.
