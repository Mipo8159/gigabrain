import type { DatabaseSync } from 'node:sqlite';
import type { Product } from './db.ts';
import { ValidationError } from './errors.ts';

const SORT_COLUMNS: Record<string, string> = {
  name: 'name COLLATE NOCASE',
  price: 'price_cents',
  newest: 'created_at',
};
const DIRECTIONS: Record<string, string> = { asc: 'ASC', desc: 'DESC' };

export function searchProducts(db: DatabaseSync, params: { q?: string; sort?: string; dir?: string }): Product[] {
  const sort = params.sort ?? 'name';
  const dir = params.dir ?? 'asc';
  if (!Object.hasOwn(SORT_COLUMNS, sort)) throw new ValidationError(`unknown sort: ${sort}`);
  if (!Object.hasOwn(DIRECTIONS, dir)) throw new ValidationError(`unknown dir: ${dir}`);

  const sql = `SELECT id, name, price_cents, created_at FROM products
               WHERE name LIKE ?
               ORDER BY ${SORT_COLUMNS[sort]} ${DIRECTIONS[dir]}, id ${DIRECTIONS[dir]}
               LIMIT 50`;
  return (db.prepare(sql).all(`%${params.q ?? ''}%`) as Product[]).map(r => ({ ...r }));
}
