import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Money } from '../src/lib/money.ts';
import { createInvoice } from '../src/billing/invoices.ts';
import { installments } from '../src/billing/installments.ts';
import { formatMoney } from '../src/lib/format.ts';

const eur = (c: number) => Money.of(c, 'EUR');

test('per-line tax, half-even rounding', () => {
  const inv = createInvoice({
    customerId: 'c1', currency: 'EUR', taxRateBps: 2000,
    lines: [
      { id: 'a', description: 'Widget', unitPrice: eur(1999), quantity: 2 },   // 3998 -> tax 799.6 -> 800
      { id: 'b', description: 'Cable', unitPrice: eur(1), quantity: 5 },      // 5 -> tax 1
    ],
  });
  assert.equal(inv.subtotal.amount, 4003);
  assert.equal(inv.tax.amount, 801);
  assert.equal(inv.total.amount, 4804);
  assert.equal(formatMoney(inv.total), '€48.04');
});

test('installments add up to the total', () => {
  const inv = createInvoice({ customerId: 'c1', currency: 'EUR', taxRateBps: 0, lines: [{ id: 'a', description: 'x', unitPrice: eur(1000), quantity: 1 }] });
  const parts = installments(inv, 3);
  assert.deepEqual(parts.map((p) => p.amount), [334, 333, 333]);
});
