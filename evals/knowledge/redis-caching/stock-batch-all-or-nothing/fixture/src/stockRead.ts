import type { Redis } from 'ioredis';

export async function stockFor(redis: Redis, sku: string): Promise<Record<string, number>> {
  const raw = await redis.hgetall(`stock:${sku}`);
  return Object.fromEntries(Object.entries(raw).map(([w, n]) => [w, Number(n)]));
}
