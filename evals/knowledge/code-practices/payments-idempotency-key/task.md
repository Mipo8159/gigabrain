---
timeout: 600
---
Our mobile app retries `POST /payments` when a request times out, and users double-tap the Pay button. Support
found customers charged twice. Make the endpoint safe to retry with an `Idempotency-Key` header.

The handler lives in `src/payments.ts` and is framework-free:

```ts
export function createPaymentsHandler(deps: PaymentsDeps): (req: PaymentRequest) => Promise<PaymentResponse>
// PaymentRequest  = { headers: Record<string, string | undefined>; body: unknown }   (header names lower-case)
// PaymentResponse = { status: number; body: unknown }
```

Keep the existing request validation and response shape. What we need:

- The client generates a key per payment attempt and sends it as `idempotency-key`. Retries of the same payment
  reuse the key. A request carrying a key must never cause a second charge for that payment.
- A client that retries should get the same answer it would have got the first time.
- `chargeCard` talks to the card processor and can fail (it throws); today we return 502 for that, keep doing so.
- Requests without the header keep working as they do now.

We run one instance for now, so in-memory state inside the handler is fine. Keep it dependency-free.
Add tests of your own if you like (`node --test`).
