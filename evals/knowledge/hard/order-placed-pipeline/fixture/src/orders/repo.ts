import type { Db } from '../db/pool.ts';
import type { OrderView, OrderItem, OrderStatus } from './types.ts';

type Row = { id: string; customer_id: string; status: OrderStatus; total_cents: string; version: number; updated_at: Date };

/** Current state of an order from Postgres (the source of truth), or null. */
export async function loadOrderView(db: Db, id: string): Promise<OrderView | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const o = await db.query<Row>(
    'SELECT id, customer_id, status, total_cents, version, updated_at FROM orders WHERE id = $1', [id]);
  const row = o.rows[0];
  if (!row) return null;
  const items = await db.query<{ sku: string; qty: number; unit_price_cents: string }>(
    'SELECT sku, qty, unit_price_cents FROM order_items WHERE order_id = $1 ORDER BY line', [id]);
  return {
    id: row.id,
    customerId: row.customer_id,
    status: row.status,
    totalCents: Number(row.total_cents),
    items: items.rows.map((i): OrderItem => ({ sku: i.sku, qty: i.qty, unitPriceCents: Number(i.unit_price_cents) })),
    version: row.version,
    updatedAt: row.updated_at.toISOString(),
  };
}
