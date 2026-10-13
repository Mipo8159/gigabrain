import type pg from 'pg';

export async function softDeleteUser(pool: pg.Pool, id: number): Promise<void> {
  await pool.query('UPDATE users SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL', [id]);
}

export async function upsertUser(pool: pg.Pool, input: { email: string; name: string }): Promise<number> {
  const { rows } = await pool.query(
    `INSERT INTO users (email, name, last_login_at) VALUES ($1, $2, now())
     ON CONFLICT (email) WHERE deleted_at IS NULL
     DO UPDATE SET name = EXCLUDED.name, last_login_at = EXCLUDED.last_login_at
     RETURNING id`,
    [input.email, input.name],
  );
  return rows[0].id;
}
