import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Money } from '../src/lib/money.ts';
import { createInvoice } from '../src/billing/invoices.ts';
import { refundLines } from '../src/billing/refunds.ts';

const eur = (c: number) => Money.of(c, 'EUR');
const amt = (m: any) => (typeof m === 'number' ? m : m?.amount);

// Line nets chosen so that per-line tax lands exactly on half a cent for several of them.
const invoice = () => createInvoice({
  customerId: 'c9', currency: 'EUR', taxRateBps: 500,
  lines: [
    { id: 'l1', description: 'Lamp', unitPrice: eur(1010), quantity: 1 },     // 50.5 cents of tax
    { id: 'l2', description: 'Shade', unitPrice: eur(1030), quantity: 1 },    // 51.5
    { id: 'l3', description: 'Bulb', unitPrice: eur(210), quantity: 5 },      // 1050 -> 52.5
    { id: 'l4', description: 'Hook', unitPrice: eur(333), quantity: 3 },      // 999 -> 49.95
  ],
});

test('refunding every line returns exactly what was charged', () => {
  const inv = invoice();
  const r = refundLines(inv, ['l1', 'l2', 'l3', 'l4']);
  assert.equal(amt(r.subtotal), inv.subtotal.amount);
  assert.equal(amt(r.tax), inv.tax.amount);
  assert.equal(amt(r.total), inv.total.amount);
});

test('a line refund matches what that line was charged on its own', () => {
  const inv = invoice();
  for (const l of inv.lines) {
    const alone = createInvoice({ customerId: 'c9', currency: 'EUR', taxRateBps: 500, lines: [{ id: l.id, description: l.description, unitPrice: l.unitPrice, quantity: l.quantity }] });
    const r = refundLines(inv, [l.id]);
    assert.equal(amt(r.tax), alone.tax.amount, `tax on ${l.id}`);
    assert.equal(amt(r.total), alone.total.amount, `total on ${l.id}`);
  }
});

test('partial refunds of disjoint lines add up to the invoice', () => {
  const inv = invoice();
  const a = refundLines(inv, ['l1', 'l3']);
  const b = refundLines(inv, ['l2', 'l4']);
  assert.equal(amt(a.total) + amt(b.total), inv.total.amount);
  assert.ok(Number.isInteger(amt(a.total)) && amt(a.total) > 0);
});

test('bad line ids are rejected', () => {
  const inv = invoice();
  assert.throws(() => refundLines(inv, []), RangeError);
  assert.throws(() => refundLines(inv, ['l1', 'l1']), RangeError);
  assert.throws(() => refundLines(inv, ['nope']), RangeError);
});
