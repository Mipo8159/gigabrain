import pg from 'pg';

export type Pool = pg.Pool;
export type Db = pg.Pool | pg.PoolClient;

export function createPool(url: string): pg.Pool {
  const pool = new pg.Pool({ connectionString: url, max: 10 });
  pool.on('error', (e) => console.error('idle pg client error', e));
  return pool;
}
