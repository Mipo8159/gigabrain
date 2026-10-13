import type pg from 'pg';
import { PaymentDeclinedError, type PaymentsClient, type ChargeResult } from '../payments/types.ts';
import type { Clock } from '../clock.ts';
import { nextRenewal } from './schedule.ts';

export type BillingDeps = { pool: pg.Pool; payments: PaymentsClient; clock: Clock };
export type CycleResult = { billed: number; declined: number; deferred: number };

const BACKOFF_MS = [200, 400];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Due = {
  id: string; customer_id: string; started_at: Date; next_bill_at: Date;
  price_minor: string; currency: string; interval: 'month' | 'year'; timezone: string;
};

/**
 * One billing cycle: renews every subscription that is due.
 * Each subscription is claimed with FOR UPDATE SKIP LOCKED in its own transaction, so overlapping cycles on
 * other replicas skip it, and a crash or shutdown releases it at once. The idempotency key is derived from
 * the subscription and period, so a retry (or a later cycle after a lost response) never charges twice.
 */
export async function runBillingCycle(deps: BillingDeps, signal?: AbortSignal): Promise<CycleResult> {
  const result: CycleResult = { billed: 0, declined: 0, deferred: 0 };
  const now = deps.clock.now();
  const seen: string[] = [];

  while (!signal?.aborted) {
    const c = await deps.pool.connect();
    let more = true;
    try {
      await c.query('BEGIN');
      const r = await c.query<Due>(
        `SELECT s.id::text, s.customer_id, s.started_at, s.next_bill_at, p.price_minor::text, p.currency, p.interval, cu.timezone
           FROM subscriptions s
           JOIN plans p ON p.id = s.plan_id
           JOIN customers cu ON cu.id = s.customer_id
          WHERE s.status = 'active' AND s.next_bill_at <= $1 AND NOT (s.id = ANY($2::bigint[]))
          ORDER BY s.next_bill_at, s.id
          LIMIT 1
          FOR UPDATE OF s SKIP LOCKED`, [now, seen]);
      const sub = r.rows[0];
      if (!sub) {
        more = false;
      } else {
        seen.push(sub.id);
        await renew(deps, c, sub, result);
      }
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      c.release();
    }
    if (!more) break;
  }
  return result;
}

async function renew(deps: BillingDeps, c: pg.PoolClient, sub: Due, result: CycleResult) {
  const periodStart = sub.next_bill_at;
  const periodEnd = nextRenewal(sub.started_at, periodStart, sub.timezone, sub.interval);
  const amount = Number(sub.price_minor);
  const req = {
    customerId: sub.customer_id,
    amountMinor: amount,
    currency: sub.currency,
    idempotencyKey: `renewal:${sub.id}:${periodStart.toISOString()}`,
    description: `Subscription ${sub.id} ${periodStart.toISOString().slice(0, 10)} – ${periodEnd.toISOString().slice(0, 10)}`,
  };

  let paid: ChargeResult | null = null;
  for (let attempt = 0; ; attempt++) {
    try {
      paid = await deps.payments.charge(req); // no signal: an in-flight charge is allowed to finish
      break;
    } catch (e) {
      if (e instanceof PaymentDeclinedError) {
        await c.query(
          `INSERT INTO invoices (subscription_id, period_start, period_end, amount_minor, currency, status, failure_reason)
           VALUES ($1, $2, $3, $4, $5, 'failed', $6) ON CONFLICT (subscription_id, period_start) DO NOTHING`,
          [sub.id, periodStart, periodEnd, amount, sub.currency, e.code]);
        await c.query(`UPDATE subscriptions SET status = 'past_due' WHERE id = $1`, [sub.id]);
        result.declined++;
        return;
      }
      if (attempt >= BACKOFF_MS.length) {
        result.deferred++;
        return;
      }
      await sleep(BACKOFF_MS[attempt]);
    }
  }
  await c.query(
    `INSERT INTO invoices (subscription_id, period_start, period_end, amount_minor, currency, status, payment_id)
     VALUES ($1, $2, $3, $4, $5, 'paid', $6)`,
    [sub.id, periodStart, periodEnd, amount, sub.currency, paid.paymentId]);
  await c.query('UPDATE subscriptions SET next_bill_at = $2 WHERE id = $1', [sub.id, periodEnd]);
  result.billed++;
}
