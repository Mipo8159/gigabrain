import { z } from 'zod';
import type { Settlement } from './types.ts';
import { InvalidPayloadError } from './errors.ts';

const ts = z.iso.datetime({ offset: true }).transform(s => new Date(s));

const Body = z.object({
  id: z.string().min(1),
  occurred_at: ts,
  settled_at: ts.nullable(),
  amount_cents: z.number().int(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  reference: z.string().exactOptional(),
});

export function parseSettlement(body: unknown): Settlement {
  const r = Body.safeParse(body);
  if (!r.success) throw new InvalidPayloadError(r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
  const b = r.data;
  return {
    id: b.id,
    occurredAt: b.occurred_at,
    settledAt: b.settled_at,
    amountCents: b.amount_cents,
    currency: b.currency,
    ...(b.reference !== undefined && { reference: b.reference }),
  };
}
