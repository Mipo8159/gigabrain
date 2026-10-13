import type pg from 'pg';

export async function withTenant<T>(
  pool: pg.Pool,
  tenantId: number,
  fn: (db: pg.PoolClient) => Promise<T>,
): Promise<T> {
  throw new Error('not implemented');
}
