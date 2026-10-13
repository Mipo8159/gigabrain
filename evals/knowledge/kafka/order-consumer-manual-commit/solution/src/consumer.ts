import type { Consumer } from 'kafkajs';
import type { Order } from './orders.ts';

export async function startOrderConsumer(
  consumer: Consumer,
  topic: string,
  save: (order: Order) => Promise<void>,
): Promise<void> {
  await consumer.subscribe({ topics: [topic], fromBeginning: true });
  await consumer.run({
    autoCommit: false,
    eachMessage: async ({ topic, partition, message }) => {
      const order = JSON.parse(message.value!.toString('utf8')) as Order;
      await save(order);
      // The committed offset is the NEXT one to read. Offsets are int64 strings.
      const next = (BigInt(message.offset) + 1n).toString();
      await consumer.commitOffsets([{ topic, partition, offset: next }]);
    },
  });
}
