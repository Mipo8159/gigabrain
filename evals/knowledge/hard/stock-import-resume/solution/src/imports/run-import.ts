import type pg from 'pg';
import type { ObjectStorage } from '../storage/types.ts';
import { getImport } from './repo.ts';
import { parseCsv } from './csv.ts';

export type ImportDeps = { pool: pg.Pool; storage: ObjectStorage };
export type ImportProgress = { rowsDone: number; rowsFailed: number };
export type ImportOptions = { onProgress?: (p: ImportProgress) => void };

const BATCH = 1000;
type Rec = { no: number; fields: string[] };

/**
 * Runs (or resumes) one stock adjustment import.
 * Each batch is applied and its progress (rows_done) recorded in the same transaction, so after a crash
 * rows_done says exactly which records are already in `products`, and the rerun skips just those.
 */
export async function runImport(deps: ImportDeps, importId: string, opts: ImportOptions = {}): Promise<ImportProgress> {
  const job = await getImport(deps.pool, importId);
  if (!job) throw new Error(`import ${importId} not found`);
  if (job.status === 'done') return { rowsDone: job.rowsDone, rowsFailed: job.rowsFailed };
  await deps.pool.query(
    `UPDATE imports SET status = 'running', error = NULL, started_at = coalesce(started_at, now()) WHERE id = $1`, [importId]);

  const skip = job.rowsDone;
  let rowsDone = job.rowsDone;
  let rowsFailed = job.rowsFailed;
  let header: Map<string, number> | null = null;
  let no = 0;
  let batch: Rec[] = [];

  const flush = async () => {
    if (batch.length === 0) return;
    const { failed, last } = await applyBatch(deps.pool, importId, batch);
    rowsDone = last;
    rowsFailed += failed;
    batch = [];
    opts.onProgress?.({ rowsDone, rowsFailed });
  };

  const stream = await deps.storage.open(job.fileKey);
  try {
    for await (const fields of parseCsv(stream)) {
      if (!header) {
        header = new Map(fields.map((f, i) => [f.trim().toLowerCase(), i]));
        for (const col of ['sku', 'name', 'delta']) {
          if (!header.has(col)) throw new Error(`missing column ${col}`);
        }
        continue;
      }
      if (fields.length === 1 && fields[0] === '') continue; // blank line
      no++;
      if (no <= skip) continue;
      const pick = (c: string) => fields[header!.get(c)!] ?? '';
      batch.push({ no, fields: [pick('sku'), pick('name'), pick('delta')] });
      if (batch.length >= BATCH) await flush();
    }
    await flush();
  } finally {
    stream.destroy();
  }

  await deps.pool.query(`UPDATE imports SET status = 'done', finished_at = now() WHERE id = $1`, [importId]);
  return { rowsDone, rowsFailed };
}

async function applyBatch(pool: pg.Pool, importId: string, batch: Rec[]): Promise<{ failed: number; last: number }> {
  // Duplicate SKUs inside one batch are merged first: one INSERT ... ON CONFLICT can't touch a row twice.
  const bySku = new Map<string, { name: string; delta: bigint }>();
  const errors: { no: number; reason: string }[] = [];
  for (const { no, fields: [rawSku, name, rawDelta] } of batch) {
    const sku = rawSku.trim();
    const d = rawDelta.trim();
    if (!sku) { errors.push({ no, reason: 'empty sku' }); continue; }
    if (!/^[+-]?\d{1,18}$/.test(d)) { errors.push({ no, reason: `invalid delta ${JSON.stringify(rawDelta)}` }); continue; }
    const cur = bySku.get(sku) ?? { name: '', delta: 0n };
    cur.delta += BigInt(d);
    if (name.trim()) cur.name = name;
    bySku.set(sku, cur);
  }
  const last = batch[batch.length - 1].no;
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    if (bySku.size) {
      const skus = [...bySku.keys()];
      await c.query(
        `INSERT INTO products (sku, name, stock)
         SELECT u.sku, CASE WHEN u.name = '' THEN u.sku ELSE u.name END, u.delta
           FROM unnest($1::text[], $2::text[], $3::bigint[]) AS u(sku, name, delta)
         ON CONFLICT (sku) DO UPDATE
           SET stock = products.stock + EXCLUDED.stock,
               name = CASE WHEN $4::text[] @> ARRAY[EXCLUDED.sku] THEN products.name ELSE EXCLUDED.name END,
               updated_at = now()`,
        [skus, skus.map((s) => bySku.get(s)!.name), skus.map((s) => bySku.get(s)!.delta.toString()),
         skus.filter((s) => bySku.get(s)!.name === '')]);
    }
    if (errors.length) {
      await c.query(
        `INSERT INTO import_errors (import_id, record, reason)
         SELECT $1, e.no, e.reason FROM unnest($2::bigint[], $3::text[]) AS e(no, reason)
         ON CONFLICT DO NOTHING`,
        [importId, errors.map((e) => e.no), errors.map((e) => e.reason)]);
    }
    await c.query('UPDATE imports SET rows_done = $2, rows_failed = rows_failed + $3 WHERE id = $1', [importId, last, errors.length]);
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
  return { failed: errors.length, last };
}
