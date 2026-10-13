import { clock } from '../lib/clock.ts';
import { newId } from '../lib/ids.ts';
import { Table } from '../lib/store.ts';
import type { Membership, Team } from './types.ts';

export const teams = new Table<Team>();
export const memberships = new Table<Membership>();

export function createTeam(name: string, ownerId: string): Team {
  const now = clock.now().toISOString();
  const team = teams.insert({ id: newId('team'), name, createdAt: now });
  memberships.insert({ id: newId('mem'), teamId: team.id, userId: ownerId, role: 'owner', joinedAt: now });
  return team;
}

export function addMember(teamId: string, userId: string): Membership {
  const [existing] = memberships.find((m) => m.teamId === teamId && m.userId === userId);
  if (existing) return existing;
  return memberships.insert({ id: newId('mem'), teamId, userId, role: 'member', joinedAt: clock.now().toISOString() });
}

export function listMembers(teamId: string): Membership[] {
  return memberships.find((m) => m.teamId === teamId);
}
