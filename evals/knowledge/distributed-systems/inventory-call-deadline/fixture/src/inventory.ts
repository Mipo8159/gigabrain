export type Stock = { sku: string; available: number };

const BASE_URL = process.env.INVENTORY_URL ?? 'http://inventory.internal';

export async function getStock(sku: string, opts: { signal?: AbortSignal } = {}): Promise<Stock> {
  const res = await fetch(`${BASE_URL}/stock/${encodeURIComponent(sku)}`, { signal: opts.signal });
  if (!res.ok) throw new Error(`inventory responded ${res.status}`);
  return (await res.json()) as Stock;
}
