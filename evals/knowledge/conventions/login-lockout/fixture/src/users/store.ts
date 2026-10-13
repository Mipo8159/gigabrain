export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  passwordHash: string;
  createdAt: string;
  failedLogins: number;
  lockedAt: string | null;
}

const users = new Map<string, User>();

export const userStore = {
  put(u: User): void { users.set(u.id, { ...u }); },
  get(id: string): User | undefined { const u = users.get(id); return u && { ...u }; },
  byEmail(email: string): User | undefined {
    const e = email.trim().toLowerCase();
    for (const u of users.values()) if (u.email.toLowerCase() === e) return { ...u };
    return undefined;
  },
  update(id: string, patch: Partial<User>): User {
    const u = { ...users.get(id)!, ...patch };
    users.set(id, u);
    return { ...u };
  },
  clear(): void { users.clear(); },
};
