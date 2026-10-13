import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import type pg from 'pg';
import { withTx } from './tx.ts';

const DIR = fileURLToPath(new URL('../../migrations/', import.meta.url));

/** Applies migrations/*.sql in name order, each file in its own transaction. Safe to call on every boot. */
export async function migrate(pool: pg.Pool): Promise<string[]> {
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const lock = await pool.connect(); // session-level lock: must stay on this one connection
  await lock.query('SELECT pg_advisory_lock(727001)');
  try {
    const done = new Set((await pool.query<{ name: string }>('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
    const applied: string[] = [];
    for (const f of readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort()) {
      if (done.has(f)) continue;
      await withTx(pool, async (c) => {
        await c.query(readFileSync(join(DIR, f), 'utf8'));
        await c.query('INSERT INTO schema_migrations (name) VALUES ($1)', [f]);
      });
      applied.push(f);
    }
    return applied;
  } finally {
    await lock.query('SELECT pg_advisory_unlock(727001)').catch(() => {});
    lock.release();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { createPool } = await import('./pool.ts');
  const { config } = await import('../config.ts');
  const pool = createPool(config.databaseUrl);
  console.log('applied', await migrate(pool));
  await pool.end();
}
