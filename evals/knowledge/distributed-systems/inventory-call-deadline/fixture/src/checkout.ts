import { getStock } from './inventory.ts';

// Simplified checkout handler: the real one also prices the cart and creates the order.
export async function checkout(cart: { sku: string; qty: number }[], signal: AbortSignal) {
  for (const line of cart) {
    const stock = await getStock(line.sku, { signal });
    if (stock.available < line.qty) return { ok: false as const, reason: `out of stock: ${line.sku}` };
  }
  return { ok: true as const };
}
