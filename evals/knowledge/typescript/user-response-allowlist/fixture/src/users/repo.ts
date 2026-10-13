import type { UserRow } from './types.ts';

export interface Db {
  query<T>(sql: string, params: unknown[]): Promise<{ rows: T[] }>;
}

export interface UsersRepo {
  findById(id: string): Promise<UserRow | null>;
  listByTeam(teamId: string): Promise<UserRow[]>;
}

export function pgUsersRepo(db: Db): UsersRepo {
  return {
    async findById(id) {
      const { rows } = await db.query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
      return rows[0] ?? null;
    },
    async listByTeam(teamId) {
      const { rows } = await db.query<UserRow>('SELECT * FROM users WHERE "teamId" = $1', [teamId]);
      return rows;
    },
  };
}
