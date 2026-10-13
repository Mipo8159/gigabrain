---
timeout: 1800
deps: hard
services: [postgres]
check: node --test --test-force-exit --test-reporter=spec 'hidden/**/*.test.*'
check_timeout: 300
---
Ticket BIL-97: automatic subscription renewals

`billing-worker` (see README.md and docs/billing.md) has the scheduler, the PSP client and the schema, but the
billing cycle itself is a stub. Please implement `runBillingCycle(deps, signal)` in `src/billing/run-cycle.ts`
(keep the signature; `deps.clock` is the only source of "now"):

- Renew every `active` subscription whose `next_bill_at` is due: charge the plan's price through
  `deps.payments.charge(...)`, write the invoice, and move `next_bill_at` to the following renewal time per
  docs/billing.md. One period per subscription per cycle (a subscription that is several periods behind
  catches up over the next cycles).
- Declined card: `failed` invoice and the subscription goes `past_due` (see docs). `PaymentTransientError`
  or a network error: retry up to 3 attempts in total, waiting 200 ms and then 400 ms; if it still fails,
  leave the subscription due so the next cycle tries again.
- Resolve with counts: `billed` (paid invoices written), `declined`, `deferred` (left due after transient failures).

Context:
- The scheduler starts a cycle every minute on each of the 3 replicas, so cycles on different replicas
  overlap all the time.
- The PSP has slow minutes where requests time out after it has actually charged the card.
- On a deploy, `main.ts` aborts `signal` and the pod is killed 30 s later. On the first of the month a cycle has
  thousands of due subscriptions, so once `signal` is aborted, start no new charges, let the one in flight
  finish, and return. Whatever this replica didn't get to must be billable by the other replicas right away.
- Customers are all over the world; finance reconciles invoices against PSP charges every day, and a double
  charge is a refund plus a support ticket.

Add migrations if you need them (`migrations/NNN_*.sql`, applied by `migrate()`). `npm test` runs `node --test`
against `DATABASE_URL`; `test/helpers.ts` has seeding helpers and `src/payments/fake-client.ts` a fake PSP.
