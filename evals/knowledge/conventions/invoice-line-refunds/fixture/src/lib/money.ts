/** Integer minor units. All arithmetic stays in integers; see docs/money.md. */
export type Currency = 'EUR' | 'USD' | 'GBP' | 'PLN';

/** a / b rounded half to even, for integers (b > 0). */
function divRoundHalfEven(a: number, b: number): number {
  const q = Math.trunc(a / b);
  const r = a - q * b;
  const twice = Math.abs(r) * 2;
  if (twice < b) return q;
  if (twice > b) return q + Math.sign(a);
  return q % 2 === 0 ? q : q + Math.sign(a);
}

export class Money {
  readonly amount: number;
  readonly currency: Currency;

  private constructor(amount: number, currency: Currency) {
    if (!Number.isSafeInteger(amount)) throw new RangeError(`Money amount must be an integer number of minor units, got ${amount}`);
    this.amount = amount;
    this.currency = currency;
  }

  static of(minor: number, currency: Currency): Money {
    return new Money(minor, currency);
  }
  static zero(currency: Currency): Money {
    return new Money(0, currency);
  }
  static sum(items: Money[], currency: Currency): Money {
    return items.reduce((a, b) => a.add(b), Money.zero(currency));
  }

  add(o: Money): Money {
    this.same(o);
    return new Money(this.amount + o.amount, this.currency);
  }
  subtract(o: Money): Money {
    this.same(o);
    return new Money(this.amount - o.amount, this.currency);
  }
  times(qty: number): Money {
    if (!Number.isInteger(qty)) throw new RangeError('quantity must be an integer');
    return new Money(this.amount * qty, this.currency);
  }
  negate(): Money {
    return new Money(-this.amount, this.currency);
  }
  /** This amount times bps / 10000, rounded half to even. */
  percent(bps: number): Money {
    if (!Number.isInteger(bps)) throw new RangeError('basis points must be an integer');
    return new Money(divRoundHalfEven(this.amount * bps, 10_000), this.currency);
  }
  /** Split by integer ratios without losing a cent (remainder goes to the first parts). */
  allocate(ratios: number[]): Money[] {
    const total = ratios.reduce((a, b) => a + b, 0);
    const parts = ratios.map((r) => Math.floor((this.amount * r) / total));
    let rest = this.amount - parts.reduce((a, b) => a + b, 0);
    for (let i = 0; rest > 0; i++, rest--) parts[i % parts.length]++;
    return parts.map((p) => new Money(p, this.currency));
  }
  equals(o: Money): boolean {
    return this.currency === o.currency && this.amount === o.amount;
  }
  toJSON() {
    return { amount: this.amount, currency: this.currency };
  }
  private same(o: Money) {
    if (o.currency !== this.currency) throw new TypeError(`currency mismatch ${this.currency} vs ${o.currency}`);
  }
}
