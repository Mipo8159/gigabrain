import type pg from 'pg';

export type FeedEvent = { id: number; tenantId: number; kind: string; createdAt: Date };

// Cursor = created_at (as Postgres text, full microsecond precision) + id of the last row seen.
export async function listEvents(
  pool: pg.Pool,
  tenantId: number,
  opts: { limit: number; cursor?: string | null },
): Promise<{ items: FeedEvent[]; nextCursor: string | null }> {
  let after: [string, string] | null = null;
  if (opts.cursor) after = JSON.parse(Buffer.from(opts.cursor, 'base64url').toString());
  const { rows } = await pool.query(
    `SELECT id, tenant_id, kind, created_at, created_at::text AS ts
       FROM events
      WHERE tenant_id = $1
        AND ($2::timestamptz IS NULL OR (created_at, id) < ($2::timestamptz, $3::bigint))
      ORDER BY created_at DESC, id DESC
      LIMIT $4`,
    [tenantId, after?.[0] ?? null, after?.[1] ?? null, opts.limit + 1],
  );
  const more = rows.length > opts.limit;
  const page = rows.slice(0, opts.limit);
  const last = page[page.length - 1];
  return {
    items: page.map((r) => ({ id: Number(r.id), tenantId: r.tenant_id, kind: r.kind, createdAt: r.created_at })),
    nextCursor: more && last ? Buffer.from(JSON.stringify([last.ts, String(last.id)])).toString('base64url') : null,
  };
}
