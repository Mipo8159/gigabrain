import { Money } from '../lib/money.ts';
import { lineTax } from './invoices.ts';
import type { Invoice, Refund } from './types.ts';

export function refundLines(invoice: Invoice, lineIds: string[]): Refund {
  if (!lineIds.length) throw new RangeError('nothing to refund');
  if (new Set(lineIds).size !== lineIds.length) throw new RangeError('duplicate line id');
  const lines = lineIds.map((id) => {
    const l = invoice.lines.find((x) => x.id === id);
    if (!l) throw new RangeError(`unknown line ${id}`);
    return l;
  });
  const subtotal = Money.sum(lines.map((l) => l.net), invoice.currency);
  const tax = Money.sum(lines.map((l) => lineTax(l, invoice.taxRateBps)), invoice.currency);
  return { invoiceId: invoice.id, lines, subtotal, tax, total: subtotal.add(tax) };
}
