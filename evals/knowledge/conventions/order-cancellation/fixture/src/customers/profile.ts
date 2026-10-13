import type pg from 'pg';
import { withTx } from '../db/tx.ts';
import { addToOutbox } from '../events/outbox.ts';

export async function changeEmail(pool: pg.Pool, customerId: number, email: string): Promise<void> {
  await withTx(pool, async (tx) => {
    const { rows } = await tx.query('SELECT email FROM customers WHERE id = $1 FOR UPDATE', [customerId]);
    if (!rows.length) throw new Error(`customer ${customerId} not found`);
    if (rows[0].email === email) return;
    await tx.query('UPDATE customers SET email = $2 WHERE id = $1', [customerId, email]);
    await addToOutbox(tx, 'customer.email_changed', { customerId, from: rows[0].email, to: email });
  });
}
