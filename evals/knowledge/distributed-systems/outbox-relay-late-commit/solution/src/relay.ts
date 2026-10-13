import type pg from 'pg';
import type { OutboxEvent } from './outbox.ts';

export type RelayOptions = {
  pool: pg.Pool;
  /** Sends one event to Kafka; resolves when the broker acked it. */
  publish: (event: OutboxEvent) => Promise<void>;
  batchSize?: number;
};

const RELAY = 'kafka';

// Cursor = (tx_id, id) of the last published row. Only rows from transactions older than every transaction still
// running (pg_snapshot_xmin) are read, so no in-flight transaction can later commit a row behind the cursor.
export function createRelay(opts: RelayOptions): { pollOnce(): Promise<number> } {
  const { pool, publish, batchSize = 100 } = opts;
  return {
    async pollOnce() {
      const pos = await pool.query<{ tx_id: string; last_id: string }>(
        'SELECT tx_id::text, last_id::text FROM outbox_relay_position WHERE relay = $1', [RELAY]);
      const txId = pos.rows[0]?.tx_id ?? '0';
      const lastId = pos.rows[0]?.last_id ?? '0';
      const { rows } = await pool.query<{ id: string; tx_id: string; aggregate_id: string; type: string; payload: unknown }>(
        `SELECT id::text, tx_id::text, aggregate_id, type, payload
           FROM outbox
          WHERE (tx_id, id) > ($1::xid8, $2::bigint)
            AND tx_id < pg_snapshot_xmin(pg_current_snapshot())
          ORDER BY tx_id, id
          LIMIT $3`,
        [txId, lastId, batchSize]);
      let published = 0;
      for (const r of rows) {
        await publish({ id: r.id, aggregateId: r.aggregate_id, type: r.type, payload: r.payload });
        // Advance only after the broker acked: a crash here republishes at most this event.
        await pool.query(
          `INSERT INTO outbox_relay_position (relay, tx_id, last_id) VALUES ($1, $2::xid8, $3)
           ON CONFLICT (relay) DO UPDATE SET tx_id = EXCLUDED.tx_id, last_id = EXCLUDED.last_id`,
          [RELAY, r.tx_id, r.id]);
        published++;
      }
      return published;
    },
  };
}
