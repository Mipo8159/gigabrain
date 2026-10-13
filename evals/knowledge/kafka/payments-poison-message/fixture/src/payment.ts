export type PaymentEvent = { paymentId: string; accountId: string; amountCents: number; currency: string };

export class InvalidPaymentError extends Error {}

/** Decode and validate a message value. Throws InvalidPaymentError for anything we can't use. */
export function parsePayment(value: Buffer | null): PaymentEvent {
  if (value === null) throw new InvalidPaymentError('empty value');
  let raw: any;
  try {
    raw = JSON.parse(value.toString('utf8'));
  } catch (e) {
    throw new InvalidPaymentError(`not JSON: ${(e as Error).message}`);
  }
  if (typeof raw?.paymentId !== 'string' || typeof raw?.accountId !== 'string' ||
      !Number.isInteger(raw?.amountCents) || typeof raw?.currency !== 'string') {
    throw new InvalidPaymentError('missing or invalid fields');
  }
  return raw as PaymentEvent;
}
