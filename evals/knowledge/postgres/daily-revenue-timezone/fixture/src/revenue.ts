import type pg from 'pg';

export type DayRevenue = { day: string; totalCents: number };

export async function dailyRevenue(pool: pg.Pool, merchantId: number, from: string, to: string): Promise<DayRevenue[]> {
  throw new Error('not implemented');
}
