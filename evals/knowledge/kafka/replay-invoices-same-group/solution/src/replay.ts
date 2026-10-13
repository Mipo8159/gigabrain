import { kafka } from './kafka.ts';
import type { Invoice } from './mailer.ts';

export async function replayInvoices(opts: {
  topic: string;
  groupId: string;
  send: (inv: Invoice) => Promise<void>;
}): Promise<{ stop(): Promise<void> }> {
  // fromBeginning only applies when the group has NO committed offset. This group has
  // offsets, so rewind them first (allowed because the group is empty during the replay).
  const admin = kafka.admin();
  await admin.connect();
  try {
    await admin.resetOffsets({ groupId: opts.groupId, topic: opts.topic, earliest: true });
  } finally {
    await admin.disconnect();
  }
  const consumer = kafka.consumer({ groupId: opts.groupId });
  await consumer.connect();
  await consumer.subscribe({ topics: [opts.topic], fromBeginning: true });
  await consumer.run({
    eachMessage: async ({ message }) => {
      await opts.send(JSON.parse(message.value!.toString()));
    },
  });
  return { stop: () => consumer.disconnect() };
}
