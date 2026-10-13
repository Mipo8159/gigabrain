import type pg from 'pg';
import type { ObjectStorage } from '../storage/types.ts';
import { getImport } from './repo.ts';
import { withTx } from '../db/tx.ts';
import { splitRecords } from './csv.ts';

export type ImportDeps = { pool: pg.Pool; storage: ObjectStorage };
export type ImportProgress = { rowsDone: number; rowsFailed: number };
export type ImportOptions = { onProgress?: (p: ImportProgress) => void };

const BATCH = 1000;
type Rec = { no: number; fields: string[] };

/** Runs (or resumes) one stock adjustment import. */
export async function runImport(deps: ImportDeps, importId: string, opts: ImportOptions = {}): Promise<ImportProgress> {
  const job = await getImport(deps.pool, importId);
  if (!job) throw new Error(`import ${importId} not found`);
  if (job.status === 'done') return { rowsDone: job.rowsDone, rowsFailed: job.rowsFailed };
  await deps.pool.query(
    `UPDATE imports SET status = 'running', error = NULL, started_at = coalesce(started_at, now()) WHERE id = $1`, [importId]);

  // Parse the file into records.
  const stream = await deps.storage.open(job.fileKey);
  const all: string[][] = [];
  let buf = '';
  for await (const chunk of stream) {
    buf += chunk.toString();
    const { records, rest } = splitRecords(buf, false);
    all.push(...records);
    buf = rest;
  }
  all.push(...splitRecords(buf, true).records);
  if (all[0]?.[0]?.charCodeAt(0) === 0xfeff) all[0][0] = all[0][0].slice(1);

  const header = new Map((all.shift() ?? []).map((f, i) => [f.trim().toLowerCase(), i]));
  for (const col of ['sku', 'name', 'delta']) if (!header.has(col)) throw new Error(`missing column ${col}`);
  const recs: Rec[] = all
    .filter((f) => !(f.length === 1 && f[0] === ''))
    .map((f, i) => ({ no: i + 1, fields: [f[header.get('sku')!] ?? '', f[header.get('name')!] ?? '', f[header.get('delta')!] ?? ''] }));

  let rowsDone = job.rowsDone;
  let rowsFailed = job.rowsFailed;
  for (let i = rowsDone; i < recs.length; i += BATCH) {
    const batch = recs.slice(i, i + BATCH);
    const failed = await withTx(deps.pool, (c) => applyBatch(c, importId, batch));
    rowsDone = batch[batch.length - 1].no;
    rowsFailed += failed;
    await deps.pool.query('UPDATE imports SET rows_done = $2, rows_failed = $3 WHERE id = $1', [importId, rowsDone, rowsFailed]);
    opts.onProgress?.({ rowsDone, rowsFailed });
  }

  await deps.pool.query(`UPDATE imports SET status = 'done', finished_at = now() WHERE id = $1`, [importId]);
  return { rowsDone, rowsFailed };
}

async function applyBatch(c: pg.PoolClient, importId: string, batch: Rec[]): Promise<number> {
  const rows: { sku: string; name: string; delta: string }[] = [];
  const errors: { no: number; reason: string }[] = [];
  for (const { no, fields: [rawSku, name, rawDelta] } of batch) {
    const sku = rawSku.trim();
    const d = rawDelta.trim();
    if (!sku) { errors.push({ no, reason: 'empty sku' }); continue; }
    if (!/^[+-]?\d{1,18}$/.test(d)) { errors.push({ no, reason: `invalid delta ${JSON.stringify(rawDelta)}` }); continue; }
    rows.push({ sku, name: name.trim() ? name : '', delta: d });
  }
  if (rows.length) {
    await c.query(
      `INSERT INTO products (sku, name, stock)
       SELECT u.sku, CASE WHEN u.name = '' THEN u.sku ELSE u.name END, u.delta
         FROM unnest($1::text[], $2::text[], $3::bigint[]) AS u(sku, name, delta)
       ON CONFLICT (sku) DO UPDATE
         SET stock = products.stock + EXCLUDED.stock,
             name = CASE WHEN EXCLUDED.name = EXCLUDED.sku THEN products.name ELSE EXCLUDED.name END,
             updated_at = now()`,
      [rows.map((r) => r.sku), rows.map((r) => r.name), rows.map((r) => r.delta)]);
  }
  if (errors.length) {
    await c.query(
      `INSERT INTO import_errors (import_id, record, reason)
       SELECT $1, e.no, e.reason FROM unnest($2::bigint[], $3::text[]) AS e(no, reason)
       ON CONFLICT DO NOTHING`,
      [importId, errors.map((e) => e.no), errors.map((e) => e.reason)]);
  }
  return errors.length;
}
