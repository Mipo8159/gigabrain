export type ChargeInput = { amountCents: number; currency: string; cardToken: string };
export type PaymentsDeps = {
  // Calls the card processor. Resolves with the processor's charge id, throws on decline/outage.
  chargeCard(input: ChargeInput): Promise<{ chargeId: string }>;
};
export type PaymentRequest = { headers: Record<string, string | undefined>; body: unknown };
export type PaymentResponse = { status: number; body: unknown };

function parse(body: unknown): ChargeInput | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;
  if (!Number.isSafeInteger(b.amountCents) || (b.amountCents as number) <= 0) return null;
  if (typeof b.currency !== 'string' || !/^[A-Z]{3}$/.test(b.currency)) return null;
  if (typeof b.cardToken !== 'string' || b.cardToken === '') return null;
  return { amountCents: b.amountCents as number, currency: b.currency, cardToken: b.cardToken };
}

export function createPaymentsHandler(deps: PaymentsDeps) {
  return async function handle(req: PaymentRequest): Promise<PaymentResponse> {
    const input = parse(req.body);
    if (!input) return { status: 400, body: { error: 'invalid_request' } };
    try {
      const { chargeId } = await deps.chargeCard(input);
      return { status: 201, body: { chargeId, amountCents: input.amountCents, currency: input.currency } };
    } catch {
      return { status: 502, body: { error: 'processor_unavailable' } };
    }
  };
}
