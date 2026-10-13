import type pg from 'pg';
import type { Tx } from '../db/tx.ts';
import { getBus, type Bus } from './bus.ts';

/** Records an event in the caller's transaction. It is published by relayOutbox() after commit. */
export async function addToOutbox(tx: Tx, type: string, payload: unknown): Promise<void> {
  await tx.query('INSERT INTO outbox(type, payload) VALUES ($1, $2)', [type, JSON.stringify(payload)]);
}

/**
 * Publishes pending outbox rows in id order and marks them sent. Stops at the first publish
 * failure (the row stays pending and is retried next time). Returns how many were sent.
 */
export async function relayOutbox(pool: pg.Pool, bus: Bus = getBus(), batch = 100): Promise<number> {
  const client = await pool.connect();
  let sent = 0;
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT id, type, payload, created_at FROM outbox WHERE sent_at IS NULL ORDER BY id LIMIT $1 FOR UPDATE SKIP LOCKED`,
      [batch],
    );
    for (const r of rows) {
      try {
        await bus.publish({ id: String(r.id), type: r.type, payload: r.payload, occurredAt: r.created_at.toISOString() });
      } catch {
        break;
      }
      await client.query('UPDATE outbox SET sent_at = now() WHERE id = $1', [r.id]);
      sent++;
    }
    await client.query('COMMIT');
    return sent;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
