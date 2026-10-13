import type pg from 'pg';

// DO UPDATE (a no-op write) instead of DO NOTHING so RETURNING also yields the id of a tag that already exists.
export async function getOrCreateTag(pool: pg.Pool, name: string): Promise<number> {
  const { rows } = await pool.query(
    `INSERT INTO tags(name) VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [name],
  );
  return rows[0].id;
}

export async function setPostTags(pool: pg.Pool, postId: number, names: string[]): Promise<number[]> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    let ids: number[] = [];
    if (names.length) {
      const { rows } = await c.query(
        `INSERT INTO tags(name) SELECT unnest($1::text[])
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [names],
      );
      ids = rows.map((r) => r.id);
    }
    await c.query('DELETE FROM post_tags WHERE post_id = $1', [postId]);
    if (ids.length) {
      await c.query('INSERT INTO post_tags(post_id, tag_id) SELECT $1, unnest($2::int[])', [postId, ids]);
    }
    await c.query('COMMIT');
    return ids;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}
