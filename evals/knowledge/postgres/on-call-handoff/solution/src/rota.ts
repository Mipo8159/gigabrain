import type pg from 'pg';

const RETRYABLE = new Set(['40001', '40P01']);

async function serializable<T>(pool: pg.Pool, fn: (c: pg.PoolClient) => Promise<T>, attempts = 10): Promise<T> {
  for (let i = 1; ; i++) {
    const c = await pool.connect();
    try {
      await c.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
      const out = await fn(c);
      await c.query('COMMIT');
      return out;
    } catch (e: any) {
      await c.query('ROLLBACK').catch(() => {});
      if (!RETRYABLE.has(e?.code) || i >= attempts) throw e;
      await new Promise((r) => setTimeout(r, Math.random() * 10 * i));
    } finally {
      c.release();
    }
  }
}

export async function goOffCall(pool: pg.Pool, doctorId: number): Promise<boolean> {
  return serializable(pool, async (c) => {
    const me = await c.query('SELECT shift_id, on_call FROM doctors WHERE id = $1', [doctorId]);
    if (!me.rowCount) throw new Error(`doctor ${doctorId} not found`);
    if (!me.rows[0].on_call) return true;
    const others = await c.query(
      'SELECT count(*)::int AS n FROM doctors WHERE shift_id = $1 AND on_call AND id <> $2',
      [me.rows[0].shift_id, doctorId],
    );
    if (others.rows[0].n === 0) return false;
    await c.query('UPDATE doctors SET on_call = false WHERE id = $1', [doctorId]);
    return true;
  });
}
