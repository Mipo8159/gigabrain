import type { Db } from '../db/pool.ts';

export type ImportStatus = 'pending' | 'running' | 'done' | 'failed';

export type ImportJob = {
  id: string;
  warehouseId: string;
  fileKey: string;
  status: ImportStatus;
  rowsDone: number;
  rowsFailed: number;
  error: string | null;
};

const COLS = `id::text, warehouse_id AS "warehouseId", file_key AS "fileKey", status,
  rows_done::int AS "rowsDone", rows_failed::int AS "rowsFailed", error`;

export async function createImport(db: Db, input: { warehouseId: string; fileKey: string }): Promise<string> {
  const r = await db.query<{ id: string }>(
    'INSERT INTO imports (warehouse_id, file_key) VALUES ($1, $2) RETURNING id::text', [input.warehouseId, input.fileKey]);
  return r.rows[0].id;
}

export async function getImport(db: Db, id: string): Promise<ImportJob | null> {
  if (!/^\d+$/.test(id)) return null;
  const r = await db.query<ImportJob>(`SELECT ${COLS} FROM imports WHERE id = $1`, [id]);
  return r.rows[0] ?? null;
}

export async function markFailed(db: Db, id: string, error: string): Promise<void> {
  await db.query(`UPDATE imports SET status = 'failed', error = $2, finished_at = now() WHERE id = $1`, [id, error.slice(0, 2000)]);
}
