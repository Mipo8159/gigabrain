import { kafka } from './kafka.ts';

export type AuditEvent = { id: string; actor: string; action: string; at: string };

export async function startAuditConsumer(opts: {
  topic: string;
  groupId: string;
  onEvent: (e: AuditEvent) => Promise<void>;
}): Promise<{ stop(): Promise<void> }> {
  // Confluent client: consumer behaviour is configured at creation time, under `kafkaJS`.
  const consumer = kafka.consumer({
    kafkaJS: { groupId: opts.groupId, fromBeginning: true, autoCommit: false },
  });
  await consumer.connect();
  await consumer.subscribe({ topics: [opts.topic] });
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      await opts.onEvent(JSON.parse(message.value!.toString()));
      await consumer.commitOffsets([{ topic, partition, offset: (BigInt(message.offset) + 1n).toString() }]);
    },
  });
  return { stop: () => consumer.disconnect() };
}
