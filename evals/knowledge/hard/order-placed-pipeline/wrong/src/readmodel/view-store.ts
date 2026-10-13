import type { Redis } from './redis.ts';
import { orderViewKey, ORDER_VIEW_TTL_SECONDS } from './keys.ts';
import type { OrderView } from '../orders/types.ts';

export async function storeView(redis: Redis, view: OrderView): Promise<void> {
  await redis.set(orderViewKey(view.id), JSON.stringify(view), { EX: ORDER_VIEW_TTL_SECONDS });
}

export async function readView(redis: Redis, orderId: string): Promise<OrderView | null> {
  const raw = await redis.get(orderViewKey(orderId));
  return raw ? (JSON.parse(raw) as OrderView) : null;
}
