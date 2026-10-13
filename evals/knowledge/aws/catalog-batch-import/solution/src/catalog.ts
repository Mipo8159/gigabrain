import { setTimeout as sleep } from 'node:timers/promises';
import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { doc, productsTable } from './db.ts';

export type Product = { sku: string; name: string; priceCents: number; stock: number };

const MAX_BATCH = 25;
const MAX_ROUNDS = 8;

export async function importProducts(products: Product[]): Promise<void> {
  // A batch with two writes to the same key is rejected whole, so dedupe first (last row wins).
  const latest = new Map<string, Product>();
  for (const p of products) latest.set(p.sku, p);
  const all = [...latest.values()];
  const table = productsTable();

  for (let i = 0; i < all.length; i += MAX_BATCH) {
    let pending: any[] = all.slice(i, i + MAX_BATCH).map(Item => ({ PutRequest: { Item } }));
    // BatchWriteItem returns 200 with UnprocessedItems when throttled: retry just those, with backoff.
    for (let round = 0; pending.length; round++) {
      if (round === MAX_ROUNDS) throw new Error(`${pending.length} products still unprocessed after ${MAX_ROUNDS} attempts`);
      if (round) await sleep(Math.min(1000, 25 * 2 ** round) * (0.5 + Math.random() / 2));
      const out = await doc.send(new BatchWriteCommand({ RequestItems: { [table]: pending } }));
      pending = out.UnprocessedItems?.[table] ?? [];
    }
  }
}
