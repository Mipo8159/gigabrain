import { clock, DAY } from '../lib/clock.ts';
import { newId, newToken } from '../lib/ids.ts';
import { Table } from '../lib/store.ts';
import { InviteExpiredError, NotFoundError } from '../errors.ts';
import { addMember } from './members.ts';
import type { Invite, Membership } from './types.ts';

const INVITE_TTL = 7 * DAY;
export const invites = new Table<Invite>();

export function createInvite(teamId: string, email: string, invitedBy: string): Invite {
  const now = clock.now();
  return invites.insert({
    id: newId('inv'), teamId, email: email.trim().toLowerCase(), invitedBy, token: newToken(),
    createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + INVITE_TTL).toISOString(), acceptedAt: null,
  });
}

export function acceptInvite(token: string, userId: string): Membership {
  const [inv] = invites.find((i) => i.token === token && i.acceptedAt === null);
  if (!inv) throw new NotFoundError('invite');
  const now = clock.now();
  if (new Date(inv.expiresAt) <= now) throw new InviteExpiredError();
  invites.update(inv.id, { acceptedAt: now.toISOString() });
  return addMember(inv.teamId, userId);
}

export function listPendingInvites(teamId: string): Invite[] {
  const now = clock.now();
  return invites.find((i) => i.teamId === teamId && i.acceptedAt === null && new Date(i.expiresAt) > now);
}
