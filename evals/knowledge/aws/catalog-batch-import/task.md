---
timeout: 600
deps: aws
---
The nightly catalogue sync writes each product with its own `PutItem`; 5,000 round trips make the job slow.
Please implement `importProducts` in `src/catalog.ts` using DynamoDB `BatchWriteItem` instead.

```ts
export type Product = { sku: string; name: string; priceCents: number; stock: number };
export async function importProducts(products: Product[]): Promise<void>;
```

- Table `PRODUCTS_TABLE`, partition key `sku`. Each product is written whole (overwrite).
- The supplier feed sometimes lists the same SKU more than once; the later row is the current one.
- The table is on-demand and gets throttled during the sync window.
- The promise resolves once every product is stored.

Use the DocumentClient in `src/db.ts`. AWS SDK v3 is installed; don't add dependencies. There's no AWS
account here. Add a test of your own if you like (`node --test`).
