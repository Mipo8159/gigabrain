import { kafka } from './kafka.ts';
import { parsePayment, type PaymentEvent } from './payment.ts';

export async function startPaymentsConsumer(opts: {
  topic: string;
  groupId: string;
  dlqTopic: string;
  apply: (p: PaymentEvent) => Promise<void>;
}): Promise<{ stop(): Promise<void> }> {
  const consumer = kafka.consumer({ groupId: opts.groupId });
  await consumer.connect();
  await consumer.subscribe({ topics: [opts.topic], fromBeginning: true });
  await consumer.run({
    eachMessage: async ({ message }) => {
      await opts.apply(parsePayment(message.value));
    },
  });
  return { stop: () => consumer.disconnect() };
}
