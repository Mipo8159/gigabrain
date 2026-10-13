import type pg from 'pg';

export type Job = { id: number; payload: unknown; attempts: number };

export async function completeJob(pool: pg.Pool, id: number): Promise<void> {
  await pool.query(`UPDATE jobs SET status = 'done', locked_by = NULL, locked_at = NULL WHERE id = $1`, [id]);
}

export async function claimJobs(pool: pg.Pool, workerId: string, limit: number): Promise<Job[]> {
  throw new Error('not implemented');
}
