import type { UsersRepo } from './repo.ts';
import type { PublicUser, UserRow } from './types.ts';

function toPublic(user: UserRow): PublicUser {
  const { email: _email, passwordHash: _passwordHash, role: _role, ...publicUser } = user;
  return publicUser;
}

export function makeUserHandlers(repo: UsersRepo): {
  getUser(id: string): Promise<{ status: 200; body: PublicUser } | { status: 404; body: { error: string } }>;
  listTeam(teamId: string): Promise<{ status: 200; body: PublicUser[] }>;
} {
  return {
    async getUser(id) {
      const user = await repo.findById(id);
      if (!user) return { status: 404, body: { error: 'user not found' } };
      return { status: 200, body: toPublic(user) };
    },

    async listTeam(teamId) {
      const members = await repo.listByTeam(teamId);
      const body = members
        .map(toPublic)
        .sort((a, b) => a.displayName.localeCompare(b.displayName));
      return { status: 200, body };
    },
  };
}
