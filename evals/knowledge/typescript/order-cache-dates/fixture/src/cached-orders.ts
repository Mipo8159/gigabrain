import type { KV } from './kv.ts';
import type { Order, OrderRepo } from './types.ts';

export function createCachedOrders(kv: KV, repo: OrderRepo, opts?: { ttlSec?: number }): {
  get(id: string): Promise<Order | null>;
} {
  throw new Error('not implemented');
}
