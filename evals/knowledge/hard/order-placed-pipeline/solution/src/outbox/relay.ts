import type pg from 'pg';
import type { Producer } from 'kafkajs';
import { log } from '../logger.ts';

const RELAY_LOCK = 727_100; // one relay at a time across all replicas
const BATCH = 500;

/**
 * Publishes unpublished outbox rows to Kafka and marks them published (`published_at`).
 * Resolves with the number of rows published by this call.
 *
 * Only one replica relays at a time (transaction-scoped advisory lock): two relays splitting the rows
 * (e.g. SKIP LOCKED) could publish a later event of an order before an earlier one is acknowledged.
 */
export async function relayOnce(pool: pg.Pool, producer: Producer): Promise<number> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const lock = await c.query<{ ok: boolean }>('SELECT pg_try_advisory_xact_lock($1) AS ok', [RELAY_LOCK]);
    if (!lock.rows[0].ok) {
      await c.query('ROLLBACK');
      return 0;
    }
    const { rows } = await c.query<{ id: string; topic: string; aggregate_id: string; payload: string }>(
      `SELECT id::text, topic, aggregate_id, payload::text FROM outbox
        WHERE published_at IS NULL ORDER BY id LIMIT ${BATCH}`);
    if (rows.length === 0) {
      await c.query('COMMIT');
      return 0;
    }
    const byTopic = new Map<string, { key: string; value: string }[]>();
    for (const r of rows) {
      if (!byTopic.has(r.topic)) byTopic.set(r.topic, []);
      byTopic.get(r.topic)!.push({ key: r.aggregate_id, value: r.payload });
    }
    await producer.sendBatch({
      acks: -1,
      topicMessages: [...byTopic].map(([topic, messages]) => ({ topic, messages })),
    });
    await c.query('UPDATE outbox SET published_at = now() WHERE id = ANY($1::bigint[])', [rows.map((r) => r.id)]);
    await c.query('COMMIT');
    return rows.length;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

/** Runs relayOnce every intervalMs until stopped. */
export function startRelay(pool: pg.Pool, producer: Producer, intervalMs: number): { stop(): Promise<void> } {
  let stopped = false;
  const loop = (async () => {
    while (!stopped) {
      try {
        const n = await relayOnce(pool, producer);
        if (n > 0) continue;
      } catch (e) {
        log.error('relay tick failed', { err: String(e) });
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  })();
  return { stop: async () => { stopped = true; await loop; } };
}
