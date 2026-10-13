---
timeout: 900
heldout: true
---
Support needs to refund individual invoice lines (a customer returns one item from an order).
Please implement `refundLines` in `src/billing/refunds.ts`:

```ts
export function refundLines(invoice: Invoice, lineIds: string[]): Refund
```

`Invoice` and `Refund` are in `src/billing/types.ts`. A refund carries the refunded lines plus their
subtotal, tax and total, as positive amounts that go back to the customer. Tax is refunded at the
invoice's tax rate. Unknown line ids, duplicates and an empty list are errors (`RangeError`).

Finance's requirement: refunding lines must give back exactly what those lines were charged, so that
refunding every line of an invoice (in one refund) returns exactly the invoice total.

Add tests next to the existing ones if you like (`npm test`).
