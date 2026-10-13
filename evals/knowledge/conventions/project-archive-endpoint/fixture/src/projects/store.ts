import { randomUUID } from 'node:crypto';

export interface Project {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

const rows = new Map<string, Project>();

export const projectStore = {
  insert(p: Omit<Project, 'id'>): Project {
    const row = { ...p, id: `p_${randomUUID().slice(0, 8)}` };
    rows.set(row.id, row);
    return { ...row };
  },
  get(id: string): Project | undefined {
    const r = rows.get(id);
    return r && { ...r };
  },
  update(id: string, patch: Partial<Project>): Project {
    const next = { ...rows.get(id)!, ...patch };
    rows.set(id, next);
    return { ...next };
  },
  remove(id: string): boolean {
    return rows.delete(id);
  },
  all(): Project[] {
    return [...rows.values()].map((r) => ({ ...r }));
  },
};
