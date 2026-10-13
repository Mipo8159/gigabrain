---
timeout: 600
deps: aws
heldout: true
---
Our payment provider calls our webhook when a payment settles. They deliver at least once: retries,
and sometimes the same event twice at the same moment, which our 3 API instances then handle in parallel.
Please implement `recordPayment` in `src/payments.ts`.

```ts
export type Payment = { paymentId: string; orderId: string; amountCents: number; currency: string };
export async function recordPayment(p: Payment): Promise<{ status: 'created' | 'duplicate'; payment: Payment }>;
```

- Table `PAYMENTS_TABLE`, partition key `paymentId`.
- The first delivery stores the payment and returns `created`. Any later or parallel delivery of the same
  `paymentId` must not change what is stored and returns `duplicate` together with the payment **as stored**
  (the provider has resent events with a corrected amount before; finance wants the original kept and seen).
- The webhook answers inside the provider's 2 s timeout, so keep it to as few DynamoDB calls as you reasonably can.

Use the DocumentClient in `src/db.ts`. AWS SDK v3 is installed; don't add dependencies. There's no AWS
account here. Add a test of your own if you like (`node --test`).
