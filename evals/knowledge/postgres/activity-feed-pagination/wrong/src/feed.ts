import type pg from 'pg';

export type FeedEvent = { id: number; tenantId: number; kind: string; createdAt: Date };

type Cursor = { createdAt: string; id: string };

function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c)).toString('base64url');
}

function decodeCursor(raw: string): Cursor {
  return JSON.parse(Buffer.from(raw, 'base64url').toString());
}

// Keyset pagination on (created_at, id): stable while new events are inserted, and cheap at any depth.
export async function listEvents(
  pool: pg.Pool,
  tenantId: number,
  opts: { limit: number; cursor?: string | null },
): Promise<{ items: FeedEvent[]; nextCursor: string | null }> {
  const after = opts.cursor ? decodeCursor(opts.cursor) : null;
  const { rows } = await pool.query(
    `SELECT id, tenant_id, kind, created_at
       FROM events
      WHERE tenant_id = $1
        AND ($2::timestamptz IS NULL OR (created_at, id) < ($2::timestamptz, $3::bigint))
      ORDER BY created_at DESC, id DESC
      LIMIT $4`,
    [tenantId, after?.createdAt ?? null, after?.id ?? null, opts.limit + 1],
  );

  const hasMore = rows.length > opts.limit;
  const page = rows.slice(0, opts.limit);
  const items: FeedEvent[] = page.map((r) => ({
    id: Number(r.id),
    tenantId: r.tenant_id,
    kind: r.kind,
    createdAt: r.created_at,
  }));

  const last = items[items.length - 1];
  return {
    items,
    nextCursor: hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: String(last.id) }) : null,
  };
}
