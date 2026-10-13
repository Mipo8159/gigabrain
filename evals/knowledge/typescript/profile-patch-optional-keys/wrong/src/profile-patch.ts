import { z } from 'zod';
import type { Profile, ProfilePatch, ProfileRepo } from './domain.ts';
import { NotFoundError, ValidationError } from './errors.ts';

const PatchBody = z.object({
  display_name: z.string().trim().min(1).max(80).optional(),
  bio: z.string().max(500).nullable().optional(),
  timezone: z.string().min(1).optional(),
  marketing_opt_in: z.boolean().optional(),
});

export function parseProfilePatch(body: unknown): ProfilePatch {
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(
      'invalid profile patch',
      parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    );
  }
  const b = parsed.data;
  return {
    displayName: b.display_name,
    bio: b.bio,
    timezone: b.timezone,
    marketingOptIn: b.marketing_opt_in,
  } as ProfilePatch;
}

export async function patchProfile(repo: ProfileRepo, id: string, body: unknown): Promise<Profile> {
  const patch = parseProfilePatch(body);
  const updated = await repo.update(id, patch);
  if (!updated) throw new NotFoundError(`profile ${id} not found`);
  return updated;
}
