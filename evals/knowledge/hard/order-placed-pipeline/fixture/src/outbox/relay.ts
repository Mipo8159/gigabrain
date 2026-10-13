import type pg from 'pg';
import type { Producer } from 'kafkajs';
import { log } from '../logger.ts';

/**
 * Publishes unpublished outbox rows to Kafka and marks them published (`published_at`).
 * Resolves with the number of rows published by this call.
 */
export async function relayOnce(pool: pg.Pool, producer: Producer): Promise<number> {
  throw new Error('not implemented');
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
