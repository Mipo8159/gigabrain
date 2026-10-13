import type { Profile, ProfilePatch, ProfileRepo } from './domain.ts';

export function parseProfilePatch(body: unknown): ProfilePatch {
  throw new Error('not implemented');
}

export async function patchProfile(repo: ProfileRepo, id: string, body: unknown): Promise<Profile> {
  throw new Error('not implemented');
}
