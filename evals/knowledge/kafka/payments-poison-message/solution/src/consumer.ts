import { kafka } from './kafka.ts';
import { InvalidPaymentError, parsePayment, type PaymentEvent } from './payment.ts';

export async function startPaymentsConsumer(opts: {
  topic: string;
  groupId: string;
  dlqTopic: string;
  apply: (p: PaymentEvent) => Promise<void>;
}): Promise<{ stop(): Promise<void> }> {
  const producer = kafka.producer({ idempotent: true, maxInFlightRequests: 1 });
  await producer.connect();
  const consumer = kafka.consumer({ groupId: opts.groupId });
  await consumer.connect();
  await consumer.subscribe({ topics: [opts.topic], fromBeginning: true });
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      let payment: PaymentEvent;
      try {
        payment = parsePayment(message.value);
      } catch (e) {
        if (!(e instanceof InvalidPaymentError)) throw e;
        // Permanent: park it, and only move past it once the DLQ write is acknowledged.
        // If this send throws, the offset is not advanced and the message is retried.
        await producer.send({
          topic: opts.dlqTopic,
          messages: [{
            key: message.key, value: message.value,
            headers: {
              ...message.headers,
              'dlq-original-topic': topic,
              'dlq-original-partition': String(partition),
              'dlq-original-offset': message.offset,
              'dlq-error': e.message,
            },
          }],
        });
        return;
      }
      // Transient failures (DB blips) propagate: kafkajs retries the same offset with backoff,
      // which blocks only this partition and keeps per-account order.
      await opts.apply(payment);
    },
  });
  return {
    stop: async () => {
      await consumer.disconnect();
      await producer.disconnect();
    },
  };
}
