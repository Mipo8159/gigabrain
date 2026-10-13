import { randomUUID } from 'node:crypto';
import { Money, type Currency } from '../lib/money.ts';
import { discountFor, type Discount } from './discounts.ts';
import type { Invoice, InvoiceLine, LineInput } from './types.ts';

export function lineTax(line: InvoiceLine, taxRateBps: number): Money {
  return line.net.percent(taxRateBps);
}

export function createInvoice(input: {
  customerId: string;
  currency: Currency;
  taxRateBps: number;
  lines: LineInput[];
  discount?: Discount;
}): Invoice {
  if (!input.lines.length) throw new RangeError('invoice needs at least one line');
  const lines: InvoiceLine[] = input.lines.map((l) => {
    if (l.unitPrice.currency !== input.currency) throw new TypeError('line currency mismatch');
    const gross = l.unitPrice.times(l.quantity);
    const discount = discountFor(gross, input.discount);
    return { ...l, discount, net: gross.subtract(discount) };
  });
  const subtotal = Money.sum(lines.map((l) => l.net), input.currency);
  const tax = Money.sum(lines.map((l) => lineTax(l, input.taxRateBps)), input.currency);
  return {
    id: `inv_${randomUUID().slice(0, 8)}`,
    customerId: input.customerId,
    currency: input.currency,
    taxRateBps: input.taxRateBps,
    lines,
    subtotal,
    tax,
    total: subtotal.add(tax),
    issuedAt: new Date().toISOString(),
  };
}
