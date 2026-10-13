import { Money } from '../lib/money.ts';
import type { Invoice, Refund } from './types.ts';

export function refundLines(invoice: Invoice, lineIds: string[]): Refund {
  if (!lineIds.length) throw new RangeError('nothing to refund');
  if (new Set(lineIds).size !== lineIds.length) throw new RangeError('duplicate line id');
  const lines = lineIds.map((id) => {
    const l = invoice.lines.find((x) => x.id === id);
    if (!l) throw new RangeError(`unknown line ${id}`);
    return l;
  });
  const subtotal = lines.reduce((s, l) => s + l.net.amount, 0);
  const tax = lines.reduce((s, l) => s + Math.round((l.net.amount * invoice.taxRateBps) / 10_000), 0);
  return {
    invoiceId: invoice.id,
    lines,
    subtotal: Money.of(subtotal, invoice.currency),
    tax: Money.of(tax, invoice.currency),
    total: Money.of(subtotal + tax, invoice.currency),
  };
}
