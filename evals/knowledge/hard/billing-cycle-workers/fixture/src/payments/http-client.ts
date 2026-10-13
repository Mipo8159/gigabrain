import { PaymentDeclinedError, PaymentTransientError, type ChargeRequest, type ChargeResult, type PaymentsClient } from './types.ts';

/** PSP REST client: POST /v1/charges. 402 = declined, 409/5xx/timeouts = transient. */
export class HttpPaymentsClient implements PaymentsClient {
  private base: string;
  private key: string;
  private timeoutMs: number;

  constructor(base: string, key: string, timeoutMs = 10_000) {
    this.base = base.replace(/\/$/, '');
    this.key = key;
    this.timeoutMs = timeoutMs;
  }

  async charge(req: ChargeRequest, signal?: AbortSignal): Promise<ChargeResult> {
    const timeout = AbortSignal.timeout(this.timeoutMs);
    let res: Response;
    try {
      res = await fetch(`${this.base}/v1/charges`, {
        method: 'POST',
        headers: { authorization: `Bearer ${this.key}`, 'content-type': 'application/json', 'idempotency-key': req.idempotencyKey },
        body: JSON.stringify({ customer: req.customerId, amount: req.amountMinor, currency: req.currency, description: req.description }),
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });
    } catch (e) {
      if (signal?.aborted) throw e;
      throw new PaymentTransientError(`psp unreachable: ${(e as Error).name}`);
    }
    if (res.status === 402) {
      const b = (await res.json().catch(() => ({}))) as { decline_code?: string };
      throw new PaymentDeclinedError(b.decline_code ?? 'declined');
    }
    if (!res.ok) {
      await res.body?.cancel();
      throw new PaymentTransientError(`psp ${res.status}`);
    }
    const b = (await res.json()) as { id: string };
    return { paymentId: b.id };
  }
}
