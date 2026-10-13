import { z } from 'zod';
import type { KV } from './kv.ts';
import type { Order, OrderRepo } from './types.ts';

const isoDate = z.iso.datetime({ offset: true }).transform(s => new Date(s));

const CachedOrder = z.object({
  id: z.string(),
  customerId: z.string(),
  status: z.enum(['pending', 'paid', 'refunded']),
  totalCents: z.number().int(),
  lines: z.array(z.object({ sku: z.string(), qty: z.number().int(), unitCents: z.number().int() })),
  createdAt: isoDate,
  paidAt: isoDate.nullable(),
});

export function createCachedOrders(kv: KV, repo: OrderRepo, opts?: { ttlSec?: number }): {
  get(id: string): Promise<Order | null>;
} {
  const ttl = opts?.ttlSec ?? 300;

  async function fromCache(key: string): Promise<Order | null> {
    try {
      const raw = await kv.get(key);
      if (raw === null) return null;
      const r = CachedOrder.safeParse(JSON.parse(raw));
      return r.success ? r.data : null;
    } catch {
      return null;
    }
  }

  return {
    async get(id) {
      const key = `order:${id}`;
      const hit = await fromCache(key);
      if (hit) return hit;
      const order = await repo.findById(id);
      if (order) {
        try {
          await kv.set(key, JSON.stringify(order), ttl);
        } catch {
          // cache write failure must not fail the lookup
        }
      }
      return order;
    },
  };
}
