import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { HttpError, postJson } from './http.ts';

export type PayoutInput = { accountId: string; amountCents: number; currency: string; reference: string };
export type Payout = { id: string; status: 'pending' | 'paid'; accountId: string; amountCents: number };

const MAX_ATTEMPTS = 5;
// 409 = the same key is still being processed (Idempotency-Key draft §2.7): wait and ask again.
const RETRY_STATUS = new Set([408, 409, 429, 500, 502, 503, 504]);

function retryable(err: unknown): boolean {
  if (err instanceof HttpError) return RETRY_STATUS.has(err.status);
  return err instanceof TypeError; // fetch network failure (ECONNRESET, socket closed, DNS...)
}

export async function createPayout(input: PayoutInput): Promise<Payout> {
  // One key per logical payout, reused by every attempt, so a retry can never pay twice.
  const key = randomUUID();
  for (let attempt = 1; ; attempt++) {
    try {
      return await postJson<Payout>('/payouts', input, { 'idempotency-key': key });
    } catch (err) {
      if (attempt >= MAX_ATTEMPTS || !retryable(err)) throw err;
      await sleep(Math.random() * Math.min(5_000, 200 * 2 ** attempt));
    }
  }
}
