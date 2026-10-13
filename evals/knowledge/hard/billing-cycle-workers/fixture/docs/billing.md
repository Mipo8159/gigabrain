# Billing rules

- Prices are in minor units (`plans.price_minor`, e.g. cents) in the plan's currency. Never floats.
- A subscription renews on the same day of the month as it started (`started_at`), at the same local time
  of day, in the customer's time zone (`customers.timezone`, IANA name). When a month is shorter than
  that day, it renews on the last day of that month. Yearly plans: same rule, every 12 months.
- One renewal = one invoice per period: `period_start` = the `next_bill_at` that was due, `period_end` = the
  following renewal time. `UNIQUE (subscription_id, period_start)`.
- The PSP deduplicates by `Idempotency-Key` for 30 days: a repeated key returns the original charge
  instead of charging again (same response, even if the first response never reached us).
- Declined cards: invoice `failed`, subscription `past_due` (dunning emails are another team's job).
  Never retry a decline automatically.
