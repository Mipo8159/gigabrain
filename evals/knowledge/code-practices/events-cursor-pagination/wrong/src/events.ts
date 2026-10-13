import type { DatabaseSync } from 'node:sqlite';
import type { EventRow } from './db.ts';

const encodeCursor = (createdAt: string) => Buffer.from(createdAt).toString('base64url');
const decodeCursor = (cursor: string) => Buffer.from(cursor, 'base64url').toString();

export function listEvents(
  db: DatabaseSync,
  opts: { limit: number; cursor?: string | null },
): { items: EventRow[]; nextCursor: string | null } {
  const limit = opts.limit;
  // Fetch one extra row so we know whether there is another page.
  const rows = (opts.cursor
    ? db.prepare(`SELECT id, type, actor, created_at FROM events
                  WHERE created_at < ?
                  ORDER BY created_at DESC LIMIT ?`).all(decodeCursor(opts.cursor), limit + 1)
    : db.prepare(`SELECT id, type, actor, created_at FROM events
                  ORDER BY created_at DESC LIMIT ?`).all(limit + 1)
  ) as EventRow[];

  const items = rows.slice(0, limit).map(r => ({ ...r }));
  const last = items.at(-1);
  return { items, nextCursor: rows.length > limit && last ? encodeCursor(last.created_at) : null };
}
