---
timeout: 600
deps: aws
---
We're onboarding a marketplace partner. Their orders land in our DynamoDB table `ORDERS_TABLE`
(partition key `orderId`, string). Please implement the two functions in `src/orders.ts`:

```ts
export type PartnerOrder = {
  orderId: string;
  partnerOrderNo: number | bigint; // the partner's int64 order number
  status: 'NEW' | 'SHIPPED';
  lines: { sku: string; qty: number; note?: string }[];
  shipping: { method: string; instructions?: string };
  raw: Record<string, unknown>;   // the partner's original payload, kept for support
};

export async function saveOrder(order: PartnerOrder): Promise<void>;

// Backs GET /orders/{orderId} (API Gateway proxy integration).
export async function getOrderResponse(orderId: string): Promise<{ statusCode: number; headers: Record<string, string>; body: string }>;
```

- `getOrderResponse` returns 404 when the order doesn't exist, otherwise 200 with a JSON body:
  `{ orderId, partnerOrderNo, status, lines, shipping, raw }`. `partnerOrderNo` goes out as a **string**
  (the frontend is JavaScript). `raw` goes out unchanged: support compares it against the partner's portal.
- Optional fields may be missing or `undefined` (our intake mapper builds objects field by field).
- The partner's ids are int64; some of the payloads already in the table carry values above 2^53.

Use the DynamoDB client in `src/db.ts`. AWS SDK v3 is installed; don't add dependencies. There's no AWS
account here. Add a test of your own if you like (`node --test`).
