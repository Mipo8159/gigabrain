import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { doc, productsTable } from './db.ts';

export type Product = { sku: string; name: string; priceCents: number; stock: number };

/** Current version: one PutItem per product. Correct but slow. */
export async function importProducts(products: Product[]): Promise<void> {
  for (const p of products) {
    await doc.send(new PutCommand({ TableName: productsTable(), Item: p }));
  }
}
