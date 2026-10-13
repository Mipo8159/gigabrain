import { splitBill } from './split.ts';

export type Entry = { userId: string; currency: string; amountMinor: number };

export function entriesForSplit(total: string, currency: string, userIds: string[]): Entry[] {
  const shares = splitBill(total, currency, userIds.length);
  return userIds.map((userId, i) => ({ userId, currency, amountMinor: shares[i] }));
}
