import type pg from 'pg';

export async function withTenant<T>(
  pool: pg.Pool,
  tenantId: number,
  fn: (db: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query(`SELECT set_config('app.tenant_id', $1, false)`, [String(tenantId)]);
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
