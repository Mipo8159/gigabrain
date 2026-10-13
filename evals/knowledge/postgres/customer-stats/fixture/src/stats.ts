import type pg from 'pg';

export type CustomerStats = {
  orders: number;
  itemsBought: number;
  spent: string;
  isRepeatCustomer: boolean;
};

export async function customerStats(pool: pg.Pool, customerId: number): Promise<CustomerStats> {
  throw new Error('not implemented');
}
