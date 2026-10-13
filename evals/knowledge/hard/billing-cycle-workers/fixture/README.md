# billing-worker

Renews subscriptions: charges the card on file through our payment provider (PSP) and writes invoices.

- Node 24, TypeScript run directly (type stripping: no enums, no parameter properties, `import type`).
- Subscriptions are created by the checkout service, which charges the first period and sets
  `next_bill_at` for the first renewal. From then on renewals are ours.
- Deployed as 3 replicas (Kubernetes Deployment, rolled on every merge, `terminationGracePeriodSeconds: 30`).
  Every replica runs the scheduler (`src/billing/scheduler.ts`), which starts a billing cycle every minute.
  There is no leader election.
- Small admin HTTP API on `ADMIN_PORT` (health, invoices of a subscription).
- All time decisions go through `Clock` (`src/clock.ts`); tests run billing at fixed instants.

Billing rules: `docs/billing.md`. PSP client: `src/payments/`.
