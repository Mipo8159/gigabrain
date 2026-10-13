---
timeout: 600
---
Finance flagged payouts that our side recorded as failed: the payouts API drops connections and returns 502/503
for a few seconds when it deploys, and `createPayout` (`src/payouts.ts`) gives up on the first error.

Please make `createPayout` retry transient failures: up to 5 attempts in total, with backoff. Notes:

- The payouts API supports the `Idempotency-Key` request header (they follow the IETF httpapi Idempotency-Key
  draft and keep keys for 24 h). Our shared `postJson` helper in `src/http.ts` already sends one.
- An account can legitimately receive several payouts of the same amount on the same day (e.g. two refunds of 20.00).
- Keep the signature `createPayout(input: PayoutInput): Promise<Payout>` and keep the HTTP calls going through the
  global `fetch` (directly or via `src/http.ts`; other services use that helper too, so don't break it).

No new dependencies. Add a test of your own if you like (`node --test`).
