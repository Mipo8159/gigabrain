export type Role = 'member' | 'admin' | 'owner';

export type UserRow = {
  id: string;
  teamId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: Role;
  passwordHash: string;
  createdAt: Date;
};

/** What any logged-in user may see about another user. */
export type PublicUser = Omit<UserRow, 'email' | 'passwordHash' | 'role'>;
