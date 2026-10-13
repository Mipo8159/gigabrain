import type { UsersRepo } from './repo.ts';
import type { PublicUser, UserRow } from './types.ts';

/** Build the public view field by field: rows can carry columns the type doesn't list. */
function toPublic(u: UserRow): PublicUser {
  return { id: u.id, teamId: u.teamId, displayName: u.displayName, avatarUrl: u.avatarUrl, createdAt: u.createdAt };
}

export function makeUserHandlers(repo: UsersRepo): {
  getUser(id: string): Promise<{ status: 200; body: PublicUser } | { status: 404; body: { error: string } }>;
  listTeam(teamId: string): Promise<{ status: 200; body: PublicUser[] }>;
} {
  return {
    async getUser(id) {
      const u = await repo.findById(id);
      if (!u) return { status: 404, body: { error: 'user not found' } };
      return { status: 200, body: toPublic(u) };
    },
    async listTeam(teamId) {
      const rows = await repo.listByTeam(teamId);
      const body = rows.map(toPublic).sort((a, b) => a.displayName.localeCompare(b.displayName));
      return { status: 200, body };
    },
  };
}
