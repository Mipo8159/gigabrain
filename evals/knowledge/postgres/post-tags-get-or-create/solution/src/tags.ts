import type pg from 'pg';

type Q = Pick<pg.Pool, 'query'>;

async function tagId(db: Q, name: string): Promise<number> {
  for (;;) {
    const ins = await db.query('INSERT INTO tags(name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id', [name]);
    if (ins.rowCount) return ins.rows[0].id;
    const sel = await db.query('SELECT id FROM tags WHERE name = $1', [name]);
    if (sel.rowCount) return sel.rows[0].id;
  }
}

export async function getOrCreateTag(pool: pg.Pool, name: string): Promise<number> {
  return tagId(pool, name);
}

export async function setPostTags(pool: pg.Pool, postId: number, names: string[]): Promise<number[]> {
  const unique = [...new Set(names)];
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const ids: number[] = [];
    for (const n of unique) ids.push(await tagId(c, n));
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
