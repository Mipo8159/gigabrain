import pg from 'pg';

// Shared by the whole service (HTTP handlers, scheduler, background jobs).
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 10_000,
});
