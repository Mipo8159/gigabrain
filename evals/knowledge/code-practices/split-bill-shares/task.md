---
timeout: 600
heldout: true
---
For the expense-sharing feature ("split this bill evenly"), implement `splitBill` in `src/split.ts`:

```ts
export function splitBill(total: string, currency: string, people: number): number[]
```

- `total` is the amount the user typed, as a decimal string in major units (`"100.00"`, `"1250"`, `"0.10"`).
- `currency` is an ISO 4217 code: whatever the group's wallet currency is. We're live in 40+ countries, so it
  can be any currency our card processor supports.
- Returns one share per person, in the currency's minor units (cents for USD), as integers. The ledger
  stores minor units only.
- Shares should be as even as possible.
- Throw (any `Error`) for input you can't split sensibly.

Node 24, no dependencies. Add tests of your own if you like (`node --test`).
