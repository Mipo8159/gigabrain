import type { DatabaseSync } from 'node:sqlite';
import type { EventRow } from './db.ts';

type Key = { t: string; id: number };
const enc = (k: Key) => Buffer.from(JSON.stringify(k)).toString('base64url');
const dec = (c: string): Key => JSON.parse(Buffer.from(c, 'base64url').toString());

export function listEvents(
  db: DatabaseSync,
  opts: { limit: number; cursor?: string | null },
): { items: EventRow[]; nextCursor: string | null } {
  const n = opts.limit;
  const rows = (opts.cursor
    ? db.prepare(`SELECT id, type, actor, created_at FROM events
                  WHERE created_at < ? OR (created_at = ? AND id < ?)
                  ORDER BY created_at DESC, id DESC LIMIT ?`).all(...(k => [k.t, k.t, k.id, n + 1])(dec(opts.cursor)))
    : db.prepare(`SELECT id, type, actor, created_at FROM events ORDER BY created_at DESC, id DESC LIMIT ?`).all(n + 1)
  ) as EventRow[];
  const items = rows.slice(0, n).map(r => ({ ...r }));
  const last = items.at(-1);
  return { items, nextCursor: rows.length > n && last ? enc({ t: last.created_at, id: last.id }) : null };
}
