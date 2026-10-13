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

type StoredResponse = { fingerprint: string; response: PaymentResponse };

export function createPaymentsHandler(deps: PaymentsDeps) {
  const completed = new Map<string, StoredResponse>();

  async function charge(input: ChargeInput): Promise<PaymentResponse> {
    try {
      const { chargeId } = await deps.chargeCard(input);
      return { status: 201, body: { chargeId, amountCents: input.amountCents, currency: input.currency } };
    } catch {
      return { status: 502, body: { error: 'processor_unavailable' } };
    }
  }

  return async function handle(req: PaymentRequest): Promise<PaymentResponse> {
    const input = parse(req.body);
    if (!input) return { status: 400, body: { error: 'invalid_request' } };

    const key = req.headers['idempotency-key'];
    if (key === undefined) return charge(input);

    const fingerprint = JSON.stringify([input.amountCents, input.currency, input.cardToken]);
    const previous = completed.get(key);
    if (previous) {
      if (previous.fingerprint !== fingerprint) return { status: 422, body: { error: 'idempotency_key_reused' } };
      return previous.response;
    }

    const response = await charge(input);
    if (response.status < 500) completed.set(key, { fingerprint, response });
    return response;
  };
}
