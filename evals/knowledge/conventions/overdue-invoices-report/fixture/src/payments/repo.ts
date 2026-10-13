import type pg from 'pg';
import { withTenant } from '../db/tenant.ts';

/** Records a payment; marks the invoice paid once fully covered. */
export function recordPayment(pool: pg.Pool, tenantId: number, invoiceId: number, amountCents: number, paidOn: string) {
  return withTenant(pool, tenantId, async (db) => {
    const inv = await db.query('SELECT amount_cents FROM invoices WHERE id = $1 FOR UPDATE', [invoiceId]);
    if (!inv.rowCount) throw new Error(`invoice ${invoiceId} not found`);
    await db.query('INSERT INTO payments(tenant_id, invoice_id, amount_cents, paid_on) VALUES ($1, $2, $3, $4)',
      [tenantId, invoiceId, amountCents, paidOn]);
    const { rows } = await db.query<{ paid: number }>(
      'SELECT coalesce(sum(amount_cents), 0)::bigint AS paid FROM payments WHERE invoice_id = $1', [invoiceId]);
    if (rows[0].paid >= inv.rows[0].amount_cents) await db.query(`UPDATE invoices SET status = 'paid' WHERE id = $1`, [invoiceId]);
    return { paidCents: rows[0].paid };
  });
}
