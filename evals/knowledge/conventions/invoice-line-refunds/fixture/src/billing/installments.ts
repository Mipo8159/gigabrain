import type { Money } from '../lib/money.ts';
import type { Invoice } from './types.ts';

/** Split an invoice total into n monthly installments that add up exactly. */
export function installments(invoice: Invoice, n: number): Money[] {
  if (!Number.isInteger(n) || n < 1) throw new RangeError('n must be a positive integer');
  return invoice.total.allocate(Array(n).fill(1));
}
