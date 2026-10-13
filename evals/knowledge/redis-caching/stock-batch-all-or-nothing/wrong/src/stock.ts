import type { Redis } from 'ioredis';

export type Adjustment = { sku: string; warehouse: string; delta: number };

export async function applyAdjustments(redis: Redis, batchId: string, adjustments: Adjustment[]): Promise<void> {
  for (const a of adjustments) {
    if (!Number.isInteger(a.delta)) throw new Error(`delta for ${a.sku}/${a.warehouse} must be an integer`);
  }

  // MULTI/EXEC so the whole batch is applied as one unit.
  const tx = redis.multi();
  for (const a of adjustments) tx.hincrby(`stock:${a.sku}`, a.warehouse, a.delta);
  tx.rpush('stock:journal', batchId);

  const results = await tx.exec();
  if (results === null) throw new Error(`batch ${batchId} was not applied`);
}
