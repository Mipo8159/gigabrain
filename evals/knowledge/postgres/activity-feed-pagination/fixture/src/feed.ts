import type pg from 'pg';

export type FeedEvent = { id: number; tenantId: number; kind: string; createdAt: Date };

export async function listEvents(
  pool: pg.Pool,
  tenantId: number,
  opts: { limit: number; cursor?: string | null },
): Promise<{ items: FeedEvent[]; nextCursor: string | null }> {
  throw new Error('not implemented');
}
