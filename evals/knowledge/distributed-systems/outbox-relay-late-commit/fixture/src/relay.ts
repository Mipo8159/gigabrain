import type pg from 'pg';
import type { OutboxEvent } from './outbox.ts';

export type RelayOptions = {
  pool: pg.Pool;
  /** Sends one event to Kafka; resolves when the broker acked it. */
  publish: (event: OutboxEvent) => Promise<void>;
  batchSize?: number;
};

export function createRelay(opts: RelayOptions): { pollOnce(): Promise<number> } {
  return {
    async pollOnce() {
      throw new Error('not implemented');
    },
  };
}
