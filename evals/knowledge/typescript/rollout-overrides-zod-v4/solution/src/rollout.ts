import { z } from 'zod';
import { REGIONS, type ParseResult } from './types.ts';

const percent = z.number().int().min(0).max(100);

const Schema = z.object({
  flag: z.string().regex(/^[a-z0-9-]{1,64}$/),
  defaultPercent: percent,
  regionOverrides: z.partialRecord(z.enum(REGIONS), percent).default({}),
  killSwitch: z.boolean().default(false),
});

export function parseRolloutConfig(input: unknown): ParseResult {
  const r = Schema.safeParse(input);
  if (r.success) return { ok: true, config: r.data };
  const errors = r.error.issues.flatMap(i => {
    const base = i.path.map(String);
    if (i.code === 'unrecognized_keys') return i.keys.map(k => ({ path: [...base, k].join('.'), message: i.message }));
    return [{ path: base.join('.'), message: i.message }];
  });
  return { ok: false, errors };
}
