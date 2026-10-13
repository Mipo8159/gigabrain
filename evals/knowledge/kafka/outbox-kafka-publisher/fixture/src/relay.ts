import type { OutboxRow } from './outbox.ts';

export type Db = {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
};

export type Publisher = {
  /** Publish rows; resolves with the ids Kafka acknowledged. */
  publish(rows: OutboxRow[]): Promise<string[]>;
};

/**
 * One relay tick. A single relay instance runs (leader-elected), every 200 ms.
 * Rows are only marked published once Kafka acknowledged them; anything else stays
 * unpublished and is picked up again on the next tick.
 */
export async function relayTick(db: Db, publisher: Publisher): Promise<number> {
  const { rows } = await db.query<OutboxRow>(
    `SELECT id::text, aggregate_id AS "aggregateId", topic, event_type AS "eventType", payload::text
       FROM outbox WHERE published_at IS NULL ORDER BY id LIMIT 500`,
  );
  if (rows.length === 0) return 0;
  const done = await publisher.publish(rows);
  if (done.length) {
    await db.query(`UPDATE outbox SET published_at = now() WHERE id = ANY($1::bigint[])`, [done]);
  }
  return done.length;
}
