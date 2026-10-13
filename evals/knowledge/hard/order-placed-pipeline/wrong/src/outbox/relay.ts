import type pg from 'pg';
import type { Producer } from 'kafkajs';
import { log } from '../logger.ts';

const BATCH = 500;

/**
 * Publishes unpublished outbox rows to Kafka and marks them published (`published_at`).
 * Resolves with the number of rows published by this call.
 *
 * Safe on several replicas: rows are claimed with FOR UPDATE SKIP LOCKED, so two relays never send the same row.
 */
export async function relayOnce(pool: pg.Pool, producer: Producer): Promise<number> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const { rows } = await c.query<{ id: string; topic: string; aggregate_id: string; payload: string }>(
      `SELECT id::text, topic, aggregate_id, payload::text FROM outbox
        WHERE published_at IS NULL ORDER BY id LIMIT ${BATCH} FOR UPDATE SKIP LOCKED`);
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
