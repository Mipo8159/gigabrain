import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type pg from 'pg';

const FILE = /^(\d{4})_([a-z0-9_]+)\.sql$/;
const NO_TX = /^--\s*migrate:no-transaction\s*$/;
const LOCK_KEY = 727_001;

export const MIGRATIONS_DIR = join(import.meta.dirname, 'migrations');

export interface Applied { version: string; name: string }

export function listMigrations(dir = MIGRATIONS_DIR) {
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const seen = new Set<string>();
  return files.map((file) => {
    const m = FILE.exec(file);
    if (!m) throw new Error(`migration file "${file}" must be named NNNN_snake_case.sql`);
    if (seen.has(m[1])) throw new Error(`duplicate migration version ${m[1]}`);
    seen.add(m[1]);
    const sql = readFileSync(join(dir, file), 'utf8');
    return { version: m[1], name: m[2], file, sql, noTransaction: NO_TX.test(sql.split('\n', 1)[0]) };
  });
}

/** Applies pending migrations in order. Safe to run concurrently from several deploy jobs. */
export async function migrate(pool: pg.Pool, dir = MIGRATIONS_DIR, log: (s: string) => void = () => {}): Promise<Applied[]> {
  const client = await pool.connect();
  const applied: Applied[] = [];
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_KEY]);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY, name text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
    const done = new Set((await client.query('SELECT version FROM schema_migrations')).rows.map((r) => r.version));
    for (const m of listMigrations(dir)) {
      if (done.has(m.version)) continue;
      log(`applying ${m.file}${m.noTransaction ? ' (no transaction)' : ''}`);
      try {
        if (m.noTransaction) {
          await client.query(m.sql);
          await client.query('INSERT INTO schema_migrations(version, name) VALUES ($1, $2)', [m.version, m.name]);
        } else {
          await client.query('BEGIN');
          await client.query(m.sql);
          await client.query('INSERT INTO schema_migrations(version, name) VALUES ($1, $2)', [m.version, m.name]);
          await client.query('COMMIT');
        }
      } catch (err) {
        if (!m.noTransaction) await client.query('ROLLBACK').catch(() => {});
        throw new Error(`migration ${m.file} failed: ${(err as Error).message}`, { cause: err });
      }
      applied.push({ version: m.version, name: m.name });
    }
    return applied;
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]).catch(() => {});
    client.release();
  }
}
