import type pg from 'pg';
import type { PaymentsClient } from '../payments/types.ts';
import type { Clock } from '../clock.ts';

export type BillingDeps = { pool: pg.Pool; payments: PaymentsClient; clock: Clock };
export type CycleResult = { billed: number; declined: number; deferred: number };

/** One billing cycle: renews every subscription that is due. See the ticket and docs/billing.md. */
export async function runBillingCycle(deps: BillingDeps, signal?: AbortSignal): Promise<CycleResult> {
  throw new Error('not implemented');
}
