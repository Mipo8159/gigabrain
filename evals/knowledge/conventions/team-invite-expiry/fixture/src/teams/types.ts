export interface Team { id: string; name: string; createdAt: string }
export interface Membership { id: string; teamId: string; userId: string; role: 'owner' | 'member'; joinedAt: string }
export interface Invite {
  id: string;
  teamId: string;
  email: string;
  invitedBy: string;
  token: string;
  createdAt: string;   // ISO 8601
  expiresAt: string;   // ISO 8601
  acceptedAt: string | null;
}
