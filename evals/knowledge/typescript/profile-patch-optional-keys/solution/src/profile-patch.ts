import { z } from 'zod';
import type { Profile, ProfilePatch, ProfileRepo } from './domain.ts';
import { NotFoundError, ValidationError } from './errors.ts';

const Body = z.object({
  display_name: z.string().trim().min(1).max(80).exactOptional(),
  bio: z.string().max(500).nullable().exactOptional(),
  timezone: z.string().min(1).exactOptional(),
  marketing_opt_in: z.boolean().exactOptional(),
});

export function parseProfilePatch(body: unknown): ProfilePatch {
  const r = Body.safeParse(body);
  if (!r.success) throw new ValidationError('invalid profile patch', r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`));
  const b = r.data;
  const patch: ProfilePatch = {};
  if (b.display_name !== undefined) patch.displayName = b.display_name;
  if (b.bio !== undefined) patch.bio = b.bio;
  if (b.timezone !== undefined) patch.timezone = b.timezone;
  if (b.marketing_opt_in !== undefined) patch.marketingOptIn = b.marketing_opt_in;
  return patch;
}

export async function patchProfile(repo: ProfileRepo, id: string, body: unknown): Promise<Profile> {
  const patch = parseProfilePatch(body);
  const row = await repo.update(id, patch);
  if (!row) throw new NotFoundError(`profile ${id} not found`);
  return row;
}
