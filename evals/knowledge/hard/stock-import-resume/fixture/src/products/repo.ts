import type { Db } from '../db/pool.ts';

export type Product = { sku: string; name: string; stock: number };

export async function getProduct(db: Db, sku: string): Promise<Product | null> {
  const r = await db.query<{ sku: string; name: string; stock: string }>('SELECT sku, name, stock FROM products WHERE sku = $1', [sku]);
  const p = r.rows[0];
  return p ? { sku: p.sku, name: p.name, stock: Number(p.stock) } : null;
}

export async function listLowStock(db: Db, below: number, limit = 100): Promise<Product[]> {
  const r = await db.query<{ sku: string; name: string; stock: string }>(
    'SELECT sku, name, stock FROM products WHERE stock < $1 ORDER BY stock, sku LIMIT $2', [below, limit]);
  return r.rows.map((p) => ({ sku: p.sku, name: p.name, stock: Number(p.stock) }));
}
