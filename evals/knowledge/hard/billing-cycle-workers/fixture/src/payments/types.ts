export type ChargeRequest = {
  customerId: string;
  amountMinor: number;
  currency: string;
  /** Sent as the PSP's Idempotency-Key header. */
  idempotencyKey: string;
  description: string;
};

export type ChargeResult = { paymentId: string };

export interface PaymentsClient {
  /** Charges the customer's card on file. Rejects with PaymentDeclinedError, PaymentTransientError, or a network/abort error. */
  charge(req: ChargeRequest, signal?: AbortSignal): Promise<ChargeResult>;
}

/** The card was declined (insufficient funds, expired, ...). Retrying does not help. */
export class PaymentDeclinedError extends Error {
  code: string;
  constructor(code: string) {
    super(`card declined: ${code}`);
    this.name = 'PaymentDeclinedError';
    this.code = code;
  }
}

/** PSP overloaded, 5xx or timed out. The charge may or may not have happened. */
export class PaymentTransientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentTransientError';
  }
}
