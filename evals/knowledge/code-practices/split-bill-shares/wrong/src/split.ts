function toCents(total: string): bigint {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(total.trim());
  if (!m) throw new RangeError(`invalid amount: ${total}`);
  return BigInt(m[1]) * 100n + BigInt((m[2] ?? '').padEnd(2, '0'));
}

export function splitBill(total: string, currency: string, people: number): number[] {
  if (!/^[A-Z]{3}$/.test(currency)) throw new RangeError(`invalid currency: ${currency}`);
  if (!Number.isSafeInteger(people) || people < 1) throw new RangeError(`invalid number of people: ${people}`);

  const cents = toCents(total);
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('amount too large');

  // Spread the remainder one cent at a time so the shares add up to the total.
  const n = BigInt(people);
  const base = cents / n;
  const remainder = cents % n;
  return Array.from({ length: people }, (_, i) => Number(base + (BigInt(i) < remainder ? 1n : 0n)));
}
