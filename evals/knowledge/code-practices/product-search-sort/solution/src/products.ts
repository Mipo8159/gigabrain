import type { DatabaseSync } from 'node:sqlite';
import type { Product } from './db.ts';
import { ValidationError } from './errors.ts';

const SORTS: Record<string, string> = { name: 'name COLLATE NOCASE', price: 'price_cents', newest: 'created_at' };
const DIRS: Record<string, string> = { asc: 'ASC', desc: 'DESC' };

export function searchProducts(db: DatabaseSync, params: { q?: string; sort?: string; dir?: string }): Product[] {
  const sort = params.sort ?? 'name';
  const dir = params.dir ?? 'asc';
  if (!Object.hasOwn(SORTS, sort)) throw new ValidationError(`unknown sort: ${sort}`);
  if (!Object.hasOwn(DIRS, dir)) throw new ValidationError(`unknown dir: ${dir}`);
  const q = params.q ?? '';
  const pattern = '%' + q.replace(/[\\%_]/g, c => '\\' + c) + '%';
  const sql = `SELECT id, name, price_cents, created_at FROM products
               WHERE name LIKE ? ESCAPE '\\'
               ORDER BY ${SORTS[sort]} ${DIRS[dir]}, id ${DIRS[dir]} LIMIT 50`;
  return (db.prepare(sql).all(pattern) as Product[]).map(r => ({ ...r }));
}
