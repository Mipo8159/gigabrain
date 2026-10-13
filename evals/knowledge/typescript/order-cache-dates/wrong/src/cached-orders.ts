import type { KV } from './kv.ts';
import type { Order, OrderRepo } from './types.ts';

type CachedOrder = Omit<Order, 'createdAt' | 'paidAt'> & {
  createdAt: string;
  paidAt: string | null;
};

function fromCached(c: CachedOrder): Order {
  return {
    ...c,
    createdAt: new Date(c.createdAt),
    paidAt: c.paidAt ? new Date(c.paidAt) : null,
  };
}

export function createCachedOrders(kv: KV, repo: OrderRepo, opts?: { ttlSec?: number }): {
  get(id: string): Promise<Order | null>;
} {
  const ttl = opts?.ttlSec ?? 300;

  return {
    async get(id) {
      const key = `order:${id}`;

      try {
        const raw = await kv.get(key);
        if (raw !== null) return fromCached(JSON.parse(raw) as CachedOrder);
      } catch {
        // cache unavailable or corrupt entry: fall through to the database
      }

      const order = await repo.findById(id);
      if (order) {
        try {
          await kv.set(key, JSON.stringify(order), ttl);
        } catch {
          // a failed cache write must not fail the lookup
        }
      }
      return order;
    },
  };
}
