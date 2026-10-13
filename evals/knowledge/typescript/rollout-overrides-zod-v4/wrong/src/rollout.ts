import { z } from 'zod';
import { REGIONS, type ParseResult } from './types.ts';

const percent = z.number().int().min(0).max(100);

const RolloutConfigSchema = z.object({
  flag: z.string().regex(/^[a-z0-9-]{1,64}$/, 'must be a lowercase slug (a-z, 0-9, -), 1-64 chars'),
  defaultPercent: percent,
  regionOverrides: z
    .record(z.enum(REGIONS), percent)
    .optional()
    .transform((overrides) => overrides ?? {}),
  killSwitch: z.boolean().default(false),
});

export function parseRolloutConfig(input: unknown): ParseResult {
  const result = RolloutConfigSchema.safeParse(input);
  if (result.success) return { ok: true, config: result.data };
  return {
    ok: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.map(String).join('.'),
      message: issue.message,
    })),
  };
}
