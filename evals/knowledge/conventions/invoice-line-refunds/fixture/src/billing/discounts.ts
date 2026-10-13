import { Money } from '../lib/money.ts';

export interface Discount { code: string; bps: number }   // 1500 = 15% off

/** Amount taken off a line by a percentage discount. */
export function discountFor(lineGross: Money, d: Discount | undefined): Money {
  return d ? lineGross.percent(d.bps) : Money.zero(lineGross.currency);
}
