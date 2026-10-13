import type { RedisClientType } from 'redis';

export type Product = { sku: string; title: string; priceCents: number };

const key = (tenantId: string, sku: string) => `catalog:${tenantId}:product:${sku}`;

export async function getCachedProduct(client: RedisClientType, tenantId: string, sku: string): Promise<Product | null> {
  const raw = await client.get(key(tenantId, sku));
  return raw === null ? null : (JSON.parse(raw) as Product);
}

export async function cacheProduct(client: RedisClientType, tenantId: string, p: Product): Promise<void> {
  await client.set(key(tenantId, p.sku), JSON.stringify(p), { expiration: { type: 'EX', value: 6 * 3600 } });
}
