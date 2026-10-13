import pg from 'pg';

export type Db = pg.Pool | pg.PoolClient;

export function createPool(url: string, max = 10): pg.Pool {
  const pool = new pg.Pool({ connectionString: url, max });
  pool.on('error', (e) => console.error('idle pg client error', e));
  return pool;
}
