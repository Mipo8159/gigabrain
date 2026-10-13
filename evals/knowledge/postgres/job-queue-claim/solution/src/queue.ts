import type pg from 'pg';

export type Job = { id: number; payload: unknown; attempts: number };

export async function completeJob(pool: pg.Pool, id: number): Promise<void> {
  await pool.query(`UPDATE jobs SET status = 'done', locked_by = NULL, locked_at = NULL WHERE id = $1`, [id]);
}

export async function claimJobs(pool: pg.Pool, workerId: string, limit: number): Promise<Job[]> {
  const { rows } = await pool.query(
    `UPDATE jobs j
        SET status = 'running', locked_by = $1, locked_at = now(), attempts = j.attempts + 1
      WHERE j.id IN (
            SELECT id FROM jobs
             WHERE status = 'pending'
             ORDER BY created_at, id
             LIMIT $2
               FOR UPDATE SKIP LOCKED)
      RETURNING j.id, j.payload, j.attempts, j.created_at`,
    [workerId, limit],
  );
  rows.sort((a, b) => a.created_at - b.created_at || Number(a.id) - Number(b.id));
  return rows.map((r) => ({ id: Number(r.id), payload: r.payload, attempts: r.attempts }));
}
