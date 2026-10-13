import type { DatabaseSync } from 'node:sqlite';
import type { EventRow } from './db.ts';

export function listEvents(
  db: DatabaseSync,
  opts: { limit: number; cursor?: string | null },
): { items: EventRow[]; nextCursor: string | null } {
  throw new Error('not implemented');
}
