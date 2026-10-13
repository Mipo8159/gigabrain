import type pg from 'pg';
import type { ObjectStorage } from '../storage/types.ts';

export type ImportDeps = { pool: pg.Pool; storage: ObjectStorage };
export type ImportProgress = { rowsDone: number; rowsFailed: number };
export type ImportOptions = { onProgress?: (p: ImportProgress) => void };

/** Runs (or resumes) one stock adjustment import. See the ticket / docs/import-format.md. */
export async function runImport(deps: ImportDeps, importId: string, opts: ImportOptions = {}): Promise<ImportProgress> {
  throw new Error('not implemented');
}
