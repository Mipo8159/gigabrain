// Old implementation on kafkajs. To be deleted once src/audit.ts is live.
import { Kafka } from 'kafkajs';

export type AuditEvent = { id: string; actor: string; action: string; at: string };

const kafka = new Kafka({ clientId: 'audit-svc', brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',') });

export async function startAuditConsumer(opts: {
  topic: string;
  groupId: string;
  onEvent: (e: AuditEvent) => Promise<void>;
}): Promise<{ stop(): Promise<void> }> {
  const consumer = kafka.consumer({ groupId: opts.groupId });
  await consumer.connect();
  await consumer.subscribe({ topic: opts.topic, fromBeginning: true });
  await consumer.run({
    autoCommit: false,
    eachMessage: async ({ topic, partition, message }) => {
      await opts.onEvent(JSON.parse(message.value!.toString()));
      await consumer.commitOffsets([{ topic, partition, offset: (BigInt(message.offset) + 1n).toString() }]);
    },
  });
  return { stop: () => consumer.disconnect() };
}
