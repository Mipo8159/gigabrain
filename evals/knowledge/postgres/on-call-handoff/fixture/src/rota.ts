import type pg from 'pg';

export async function goOffCall(pool: pg.Pool, doctorId: number): Promise<boolean> {
  throw new Error('not implemented');
}
