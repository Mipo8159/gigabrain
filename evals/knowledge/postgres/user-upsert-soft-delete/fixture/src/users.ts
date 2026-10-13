import type pg from 'pg';

export async function softDeleteUser(pool: pg.Pool, id: number): Promise<void> {
  await pool.query('UPDATE users SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL', [id]);
}

export async function upsertUser(pool: pg.Pool, input: { email: string; name: string }): Promise<number> {
  throw new Error('not implemented');
}
