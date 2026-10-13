import type pg from 'pg';

/**
 * Runs fn in a transaction whose queries are scoped to one tenant by RLS.
 * set_config(..., true) is transaction-local, so the setting never outlives the transaction
 * on the pooled connection.
 */
export async function withTenant<T>(pool: pg.Pool, tenantId: number, fn: (db: pg.PoolClient) => Promise<T>): Promise<T> {
  if (!Number.isInteger(tenantId) || tenantId <= 0) throw new TypeError(`bad tenant id ${tenantId}`);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [String(tenantId)]);
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
