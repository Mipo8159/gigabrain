import { doc, paymentsTable } from './db.ts';

export type Payment = { paymentId: string; orderId: string; amountCents: number; currency: string };

export async function recordPayment(p: Payment): Promise<{ status: 'created' | 'duplicate'; payment: Payment }> {
  throw new Error('not implemented');
}
