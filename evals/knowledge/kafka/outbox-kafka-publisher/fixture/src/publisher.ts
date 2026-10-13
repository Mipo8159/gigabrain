import type { Kafka } from 'kafkajs';
import type { OutboxRow } from './outbox.ts';

export type OutboxPublisher = {
  publish(rows: OutboxRow[]): Promise<string[]>;
  close(): Promise<void>;
};

// TODO (see ticket)
export async function createOutboxPublisher(kafka: Kafka): Promise<OutboxPublisher> {
  throw new Error('not implemented');
}
