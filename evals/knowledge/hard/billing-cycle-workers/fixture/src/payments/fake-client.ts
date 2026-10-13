import { randomUUID } from 'node:crypto';
import type { ChargeRequest, ChargeResult, PaymentsClient } from './types.ts';

/** In-memory PSP for local dev (PSP_URL=fake). Honours idempotency keys like the real one. */
export class FakePaymentsClient implements PaymentsClient {
  charges = new Map<string, ChargeRequest & { paymentId: string }>();

  async charge(req: ChargeRequest): Promise<ChargeResult> {
    const prev = this.charges.get(req.idempotencyKey);
    if (prev) return { paymentId: prev.paymentId };
    const paymentId = `py_${randomUUID()}`;
    this.charges.set(req.idempotencyKey, { ...req, paymentId });
    return { paymentId };
  }
}
