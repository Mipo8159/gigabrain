import type { Invoice, Refund } from './types.ts';

export function refundLines(invoice: Invoice, lineIds: string[]): Refund {
  throw new Error('not implemented');
}
