import pg from 'pg';

export function createPool(url = process.env.DATABASE_URL): pg.Pool {
  return new pg.Pool({ connectionString: url, max: 10 });
}
