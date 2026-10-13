export type Profile = { id: string; displayName: string; avatarUrl: string; updatedAt: number };

export interface ProfileStore {
  get(id: string): Promise<Profile | null>;
  update(id: string, patch: Partial<Pick<Profile, 'displayName' | 'avatarUrl'>>): Promise<Profile>;
}

// Stand-in for the Postgres-backed store used in production.
export class InMemoryProfileStore implements ProfileStore {
  rows = new Map<string, Profile>();
  async get(id: string) { const p = this.rows.get(id); return p ? { ...p } : null; }
  async update(id: string, patch: Partial<Pick<Profile, 'displayName' | 'avatarUrl'>>) {
    const cur = this.rows.get(id);
    if (!cur) throw new Error(`profile ${id} not found`);
    const next = { ...cur, ...patch, updatedAt: cur.updatedAt + 1 };
    this.rows.set(id, next);
    return { ...next };
  }
}
