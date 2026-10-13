import type { Redis } from 'ioredis';

export type Adjustment = { sku: string; warehouse: string; delta: number };

export async function applyAdjustments(redis: Redis, batchId: string, adjustments: Adjustment[]): Promise<void> {
  throw new Error('not implemented');
}
