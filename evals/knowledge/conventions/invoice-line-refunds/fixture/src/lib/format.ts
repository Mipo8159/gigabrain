import type { Money } from './money.ts';

const SYMBOL = { EUR: '€', USD: '$', GBP: '£', PLN: 'zł' } as const;

export function formatMoney(m: Money): string {
  const sign = m.amount < 0 ? '-' : '';
  const abs = Math.abs(m.amount);
  return `${sign}${SYMBOL[m.currency]}${Math.floor(abs / 100).toLocaleString('en-US')}.${String(abs % 100).padStart(2, '0')}`;
}
