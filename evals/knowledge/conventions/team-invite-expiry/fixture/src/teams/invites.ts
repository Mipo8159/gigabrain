import type { Invite, Membership } from './types.ts';

export function createInvite(teamId: string, email: string, invitedBy: string): Invite {
  throw new Error('not implemented');
}

export function acceptInvite(token: string, userId: string): Membership {
  throw new Error('not implemented');
}

export function listPendingInvites(teamId: string): Invite[] {
  throw new Error('not implemented');
}
