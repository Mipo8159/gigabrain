import pg from 'pg';
import { migrate } from './migrate.ts';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  const applied = await migrate(pool, undefined, (s) => console.log(s));
  console.log(applied.length ? `applied ${applied.length} migration(s)` : 'up to date');
} finally {
  await pool.end();
}
