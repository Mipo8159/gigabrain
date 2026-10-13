import type { Db } from '../db/pool.ts';

export type Invoice = {
  id: string;
  periodStart: string;
  periodEnd: string;
  amountMinor: number;
  currency: string;
  status: 'paid' | 'failed';
  paymentId: string | null;
};

export async function listInvoices(db: Db, subscriptionId: string): Promise<Invoice[]> {
  const r = await db.query(
    `SELECT id::text, period_start, period_end, amount_minor::text, currency, status, payment_id
       FROM invoices WHERE subscription_id = $1 ORDER BY period_start`, [subscriptionId]);
  return r.rows.map((x) => ({
    id: x.id,
    periodStart: x.period_start.toISOString(),
    periodEnd: x.period_end.toISOString(),
    amountMinor: Number(x.amount_minor),
    currency: x.currency,
    status: x.status,
    paymentId: x.payment_id,
  }));
}
