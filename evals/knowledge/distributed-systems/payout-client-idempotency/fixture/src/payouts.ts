import { postJson } from './http.ts';

export type PayoutInput = { accountId: string; amountCents: number; currency: string; reference: string };
export type Payout = { id: string; status: 'pending' | 'paid'; accountId: string; amountCents: number };

export async function createPayout(input: PayoutInput): Promise<Payout> {
  return postJson<Payout>('/payouts', input);
}
