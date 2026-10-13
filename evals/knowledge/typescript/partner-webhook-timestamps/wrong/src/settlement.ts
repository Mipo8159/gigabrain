import { z } from 'zod';
import type { Settlement } from './types.ts';
import { InvalidPayloadError } from './errors.ts';

const PaylaneSettlement = z.object({
  id: z.string().min(1),
  occurred_at: z.coerce.date(),
  settled_at: z.coerce.date().nullable(),
  amount_cents: z.number().int(),
  currency: z.string().regex(/^[A-Z]{3}$/, 'must be a 3-letter ISO code'),
  reference: z.string().optional(),
});

export function parseSettlement(body: unknown): Settlement {
  const parsed = PaylaneSettlement.safeParse(body);
  if (!parsed.success) {
    throw new InvalidPayloadError(
      parsed.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; '),
    );
  }
  const b = parsed.data;
  const settlement: Settlement = {
    id: b.id,
    occurredAt: b.occurred_at,
    settledAt: b.settled_at,
    amountCents: b.amount_cents,
    currency: b.currency,
  };
  if (b.reference !== undefined) settlement.reference = b.reference;
  return settlement;
}
