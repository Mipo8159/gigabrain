import type { Kafka } from 'kafkajs';
import type { OutboxRow } from './outbox.ts';

export type OutboxPublisher = {
  publish(rows: OutboxRow[]): Promise<string[]>;
  close(): Promise<void>;
};

export async function createOutboxPublisher(kafka: Kafka): Promise<OutboxPublisher> {
  // kafkajs defaults to idempotent:false and unlimited in-flight requests, so an internal
  // retry can both duplicate and reorder. Idempotence (acks=all implied) + 1 in flight fixes both.
  const producer = kafka.producer({ idempotent: true, maxInFlightRequests: 1 });
  await producer.connect();

  return {
    async publish(rows) {
      const done: string[] = [];
      const blocked = new Set<string>(); // aggregates with a failed row in this batch
      for (const row of rows) {
        // Once an aggregate's row fails, nothing later for it may be published in this tick,
        // or the retry next tick would land it after its successors (and duplicate them).
        if (blocked.has(row.aggregateId)) continue;
        try {
          await producer.send({
            topic: row.topic,
            acks: -1,
            messages: [{ key: row.aggregateId, value: row.payload, headers: { 'event-type': row.eventType } }],
          });
          done.push(row.id);
        } catch {
          blocked.add(row.aggregateId);
        }
      }
      return done;
    },
    close: () => producer.disconnect(),
  };
}
