import { ConflictError, NotFoundError, ValidationError } from '../http/errors.ts';
import { projectStore, type Project } from './store.ts';

function cleanName(name: unknown): string {
  if (typeof name !== 'string' || !name.trim()) throw new ValidationError({ name: 'required' });
  if (name.trim().length > 80) throw new ValidationError({ name: 'max 80 characters' });
  return name.trim();
}

function assertNameFree(name: string, exceptId?: string): void {
  const taken = projectStore.all().some((p) => p.id !== exceptId && p.name.toLowerCase() === name.toLowerCase());
  if (taken) throw new ConflictError(`a project named "${name}" already exists`);
}

export function getProject(id: string): Project {
  const p = projectStore.get(id);
  if (!p) throw new NotFoundError(`project ${id}`);
  return p;
}

export function listProjects(): Project[] {
  return projectStore.all().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function createProject(input: { name?: unknown }, ownerId: string): Project {
  const name = cleanName(input?.name);
  assertNameFree(name);
  const now = new Date().toISOString();
  return projectStore.insert({ name, ownerId, createdAt: now, updatedAt: now, archivedAt: null });
}

export function renameProject(id: string, input: { name?: unknown }): Project {
  getProject(id);
  const name = cleanName(input?.name);
  assertNameFree(name, id);
  return projectStore.update(id, { name, updatedAt: new Date().toISOString() });
}

export function deleteProject(id: string): void {
  getProject(id);
  projectStore.remove(id);
}
