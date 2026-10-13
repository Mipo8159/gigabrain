import type { DatabaseSync } from 'node:sqlite';
import type { Product } from './db.ts';
import { ValidationError } from './errors.ts';

export function searchProducts(db: DatabaseSync, params: { q?: string; sort?: string; dir?: string }): Product[] {
  throw new Error('not implemented');
}
