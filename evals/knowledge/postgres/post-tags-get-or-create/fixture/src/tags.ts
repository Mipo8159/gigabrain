import type pg from 'pg';

export async function getOrCreateTag(pool: pg.Pool, name: string): Promise<number> {
  throw new Error('not implemented');
}

export async function setPostTags(pool: pg.Pool, postId: number, names: string[]): Promise<number[]> {
  throw new Error('not implemented');
}
