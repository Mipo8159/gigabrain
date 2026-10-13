import type { Profile, ProfilePatch, ProfileRepo } from './domain.ts';

/** In-memory repo used by tests and local dev. Mirrors the SQL repo: patch keys are copied onto the row. */
export class MemoryProfileRepo implements ProfileRepo {
  readonly rows = new Map<string, Profile>();
  readonly now: () => Date;

  constructor(now: () => Date = () => new Date()) {
    this.now = now;
  }

  async get(id: string): Promise<Profile | undefined> {
    return this.rows.get(id);
  }

  async update(id: string, patch: ProfilePatch): Promise<Profile | undefined> {
    const row = this.rows.get(id);
    if (!row) return undefined;
    const next: Profile = { ...row, ...patch, updatedAt: this.now() };
    this.rows.set(id, next);
    return next;
  }
}
