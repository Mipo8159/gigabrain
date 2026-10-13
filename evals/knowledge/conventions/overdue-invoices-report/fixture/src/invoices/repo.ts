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
  throw new Error('not implemented');
}
