import type { Db } from '../db/pool.ts';

export type Subscription = {
  id: string;
  customerId: string;
  planId: string;
  status: 'active' | 'past_due' | 'cancelled';
  startedAt: Date;
  nextBillAt: Date;
};

export async function getSubscription(db: Db, id: string): Promise<Subscription | null> {
  const r = await db.query(
    `SELECT id::text, customer_id AS "customerId", plan_id AS "planId", status, started_at AS "startedAt", next_bill_at AS "nextBillAt"
       FROM subscriptions WHERE id = $1`, [id]);
  return r.rows[0] ?? null;
}

export async function cancelSubscription(db: Db, id: string): Promise<boolean> {
  const r = await db.query(`UPDATE subscriptions SET status = 'cancelled' WHERE id = $1 AND status <> 'cancelled'`, [id]);
  return (r.rowCount ?? 0) > 0;
}
