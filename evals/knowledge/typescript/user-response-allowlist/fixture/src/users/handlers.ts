import type { UsersRepo } from './repo.ts';
import type { PublicUser } from './types.ts';

export function makeUserHandlers(repo: UsersRepo): {
  getUser(id: string): Promise<{ status: 200; body: PublicUser } | { status: 404; body: { error: string } }>;
  listTeam(teamId: string): Promise<{ status: 200; body: PublicUser[] }>;
} {
  throw new Error('not implemented');
}
