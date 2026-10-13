import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import { PaymentDeclinedError, type PaymentsClient, type ChargeResult } from '../payments/types.ts';
import type { Clock } from '../clock.ts';
import { withTx } from '../db/tx.ts';

export type BillingDeps = { pool: pg.Pool; payments: PaymentsClient; clock: Clock };
export type CycleResult = { billed: number; declined: number; deferred: number };

const BACKOFF_MS = [200, 400];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Due = { id: string; customer_id: string; next_bill_at: Date; price_minor: string; currency: string; interval: 'month' | 'year' };

/** Adds calendar months in UTC, clamping to the last day of the target month (Jan 31 + 1 month = Feb 28). */
export function addMonths(d: Date, months: number): Date {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + months;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d.getUTCDate(), last), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()));
}

/** One billing cycle: renews every subscription that is due. */
export async function runBillingCycle(deps: BillingDeps, signal?: AbortSignal): Promise<CycleResult> {
  const result: CycleResult = { billed: 0, declined: 0, deferred: 0 };
  if (signal?.aborted) return result;
  const { rows } = await deps.pool.query<Due>(
    `SELECT s.id::text, s.customer_id, s.next_bill_at, p.price_minor::text, p.currency, p.interval
       FROM subscriptions s JOIN plans p ON p.id = s.plan_id
      WHERE s.status = 'active' AND s.next_bill_at <= $1
      ORDER BY s.next_bill_at, s.id LIMIT 1000`, [deps.clock.now()]);
  for (const sub of rows) {
    const periodStart = sub.next_bill_at;
    const periodEnd = addMonths(periodStart, sub.interval === 'year' ? 12 : 1);
    const amount = Number(sub.price_minor);
    let paid: ChargeResult | null = null;
    for (let attempt = 0; ; attempt++) {
      try {
        paid = await deps.payments.charge({
          customerId: sub.customer_id, amountMinor: amount, currency: sub.currency, idempotencyKey: randomUUID(),
          description: `Subscription ${sub.id} renewal`,
        });
        break;
      } catch (e) {
        if (e instanceof PaymentDeclinedError) {
          await withTx(deps.pool, async (c) => {
            await c.query(
              `INSERT INTO invoices (subscription_id, period_start, period_end, amount_minor, currency, status, failure_reason)
               VALUES ($1, $2, $3, $4, $5, 'failed', $6) ON CONFLICT (subscription_id, period_start) DO NOTHING`,
              [sub.id, periodStart, periodEnd, amount, sub.currency, e.code]);
            await c.query(`UPDATE subscriptions SET status = 'past_due' WHERE id = $1`, [sub.id]);
          });
          result.declined++;
          break;
        }
        if (attempt >= BACKOFF_MS.length) { result.deferred++; break; }
        await sleep(BACKOFF_MS[attempt]);
      }
    }
    if (!paid) continue;
    await withTx(deps.pool, async (c) => {
      await c.query(
        `INSERT INTO invoices (subscription_id, period_start, period_end, amount_minor, currency, status, payment_id)
         VALUES ($1, $2, $3, $4, $5, 'paid', $6) ON CONFLICT (subscription_id, period_start) DO NOTHING`,
        [sub.id, periodStart, periodEnd, amount, sub.currency, paid!.paymentId]);
      await c.query('UPDATE subscriptions SET next_bill_at = $2 WHERE id = $1', [sub.id, periodEnd]);
    });
    result.billed++;
  }
  return result;
}
