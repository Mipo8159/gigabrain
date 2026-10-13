---
timeout: 900
deps: typescript
heldout: true
check: npx tsc -p hidden/tsconfig.json && node --test --test-reporter=dot 'hidden/**/*.test.ts'
---
Paylane (our payout partner) is starting to send settlement webhooks. Signature checking is done upstream; I need the body parsed into our domain type.

Implement in `src/settlement.ts`:

```ts
export function parseSettlement(body: unknown): Settlement;
```

`Settlement` is defined in `src/types.ts`; keep it as is. Invalid payloads throw `InvalidPayloadError` (in `src/errors.ts`); we answer those with a 400 and Paylane retries.

From Paylane's docs (example in `docs/paylane-settlement.json`):

- `id`: string, required.
- `occurred_at`: RFC 3339 timestamp, required. Paylane's servers run in several regions, so the offset varies (`Z`, `+04:00`, `-05:00`, ...). Fractional seconds are optional.
- `settled_at`: RFC 3339 timestamp, or `null` while the settlement is still pending.
- `amount_cents`: integer, required. `currency`: 3-letter uppercase ISO code.
- `reference`: optional free-text merchant reference; may be missing.

Finance reconciles on these timestamps, so a timestamp without a timezone, or anything that isn't a real timestamp, must be rejected rather than guessed. zod 4 is installed; `npm run typecheck` must stay clean.
