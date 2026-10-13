import type pg from 'pg';
import { withTenant } from '../db/tenant.ts';

export interface Invoice {
  id: number; customerId: number; number: string; status: 'draft' | 'open' | 'paid' | 'void';
  amountCents: number; issuedOn: string; dueDate: string;
}

export interface OverdueInvoice {
  invoiceId: number;
  number: string;
  customerName: string;
  dueDate: string;          // 'YYYY-MM-DD'
  daysOverdue: number;
  outstandingCents: number;
}

const COLS = `id, customer_id AS "customerId", number, status, amount_cents AS "amountCents",
  to_char(issued_on, 'YYYY-MM-DD') AS "issuedOn", to_char(due_date, 'YYYY-MM-DD') AS "dueDate"`;

export function createInvoice(
  pool: pg.Pool, tenantId: number,
  inv: { customerId: number; number: string; amountCents: number; issuedOn: string; dueDate: string; status?: Invoice['status'] },
): Promise<Invoice> {
  return withTenant(pool, tenantId, async (db) => {
    const { rows } = await db.query<Invoice>(
      `INSERT INTO invoices(tenant_id, customer_id, number, status, amount_cents, issued_on, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${COLS}`,
      [tenantId, inv.customerId, inv.number, inv.status ?? 'open', inv.amountCents, inv.issuedOn, inv.dueDate],
    );
    return rows[0];
  });
}

export function getInvoice(pool: pg.Pool, tenantId: number, id: number): Promise<Invoice | null> {
  return withTenant(pool, tenantId, async (db) =>
    (await db.query<Invoice>(`SELECT ${COLS} FROM invoices WHERE id = $1`, [id])).rows[0] ?? null);
}

export async function listOverdueInvoices(pool: pg.Pool, tenantId: number, asOf: string): Promise<OverdueInvoice[]> {
  // Read-only report: a single query, scoped explicitly to the tenant.
  const { rows } = await pool.query<OverdueInvoice>(
    `SELECT i.id AS "invoiceId", i.number, c.name AS "customerName",
            to_char(i.due_date, 'YYYY-MM-DD') AS "dueDate",
            ($1::date - i.due_date) AS "daysOverdue",
            (i.amount_cents - coalesce(p.paid, 0))::bigint AS "outstandingCents"
       FROM invoices i
       JOIN customers c ON c.id = i.customer_id
       LEFT JOIN (SELECT invoice_id, sum(amount_cents) AS paid FROM payments GROUP BY invoice_id) p ON p.invoice_id = i.id
      WHERE i.tenant_id = $2 AND i.status = 'open' AND i.due_date < $1::date
        AND i.amount_cents - coalesce(p.paid, 0) > 0
      ORDER BY i.due_date, i.id`, [asOf, tenantId]);
  return rows;
}
