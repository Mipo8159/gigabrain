function exponent(currency: string): number {
  if (!/^[A-Z]{3}$/.test(currency)) throw new RangeError(`bad currency: ${currency}`);
  return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
}

function toMinor(total: string, exp: number): bigint {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(total.trim());
  if (!m) throw new RangeError(`bad amount: ${total}`);
  const frac = m[2] ?? '';
  if (frac.length > exp && /[^0]/.test(frac.slice(exp))) throw new RangeError(`too many decimals for currency: ${total}`);
  return BigInt(m[1] + frac.slice(0, exp).padEnd(exp, '0'));
}

export function splitBill(total: string, currency: string, people: number): number[] {
  if (!Number.isSafeInteger(people) || people < 1) throw new RangeError(`bad people: ${people}`);
  const minor = toMinor(total, exponent(currency));
  if (minor > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('amount too large');
  const n = BigInt(people);
  const base = minor / n, rem = minor % n;
  return Array.from({ length: people }, (_, i) => Number(base + (BigInt(i) < rem ? 1n : 0n)));
}
