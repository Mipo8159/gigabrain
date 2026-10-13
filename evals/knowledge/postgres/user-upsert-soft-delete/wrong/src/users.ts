import type pg from 'pg';

export async function softDeleteUser(pool: pg.Pool, id: number): Promise<void> {
  await pool.query('UPDATE users SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL', [id]);
}

// Only the live row is ever updated; a soft-deleted account with the same email is left alone,
// so the INSERT below creates a fresh user for it.
export async function upsertUser(pool: pg.Pool, input: { email: string; name: string }): Promise<number> {
  const updated = await pool.query(
    `UPDATE users SET name = $2, last_login_at = now()
      WHERE email = $1 AND deleted_at IS NULL
      RETURNING id`,
    [input.email, input.name],
  );
  if (updated.rowCount) return updated.rows[0].id;

  const inserted = await pool.query(
    'INSERT INTO users (email, name, last_login_at) VALUES ($1, $2, now()) RETURNING id',
    [input.email, input.name],
  );
  return inserted.rows[0].id;
}
