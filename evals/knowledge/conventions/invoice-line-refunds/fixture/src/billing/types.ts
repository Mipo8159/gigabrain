import type { Currency, Money } from '../lib/money.ts';

export interface LineInput { id: string; description: string; unitPrice: Money; quantity: number }

export interface InvoiceLine extends LineInput {
  net: Money;          // unitPrice x quantity, after any line discount
  discount: Money;     // amount taken off this line (zero if none)
}

export interface Invoice {
  id: string;
  customerId: string;
  currency: Currency;
  taxRateBps: number;  // 2000 = 20%
  lines: InvoiceLine[];
  subtotal: Money;     // sum of line nets
  tax: Money;          // sum of per-line tax
  total: Money;        // subtotal + tax
  issuedAt: string;
}

export interface Refund {
  invoiceId: string;
  lines: InvoiceLine[];
  subtotal: Money;
  tax: Money;
  total: Money;
}
