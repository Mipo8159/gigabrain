import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { doc, productsTable } from './db.ts';

export type Product = { sku: string; name: string; priceCents: number; stock: number };

const BATCH_SIZE = 25; // BatchWriteItem limit

export async function importProducts(products: Product[]): Promise<void> {
  // The feed can repeat a SKU; keep the last row for each one.
  const bySku = new Map<string, Product>();
  for (const p of products) bySku.set(p.sku, p);
  const unique = [...bySku.values()];

  const table = productsTable();
  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE);
    await doc.send(new BatchWriteCommand({
      RequestItems: {
        [table]: batch.map(Item => ({ PutRequest: { Item } })),
      },
    }));
  }
}
