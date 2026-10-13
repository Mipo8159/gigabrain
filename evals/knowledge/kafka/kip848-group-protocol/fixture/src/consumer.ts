import ck from '@confluentinc/kafka-javascript';
import { kafka } from './kafka.ts';

export type ShipmentUpdate = { shipmentId: string; status: string; at: string };

export async function startShipmentConsumer(opts: {
  topic: string;
  groupId: string;
  onUpdate: (u: ShipmentUpdate) => Promise<void>;
}): Promise<{ stop(): Promise<void> }> {
  const consumer = kafka.consumer({
    // Tuned in INC-2291 so dead pods are detected quickly and partitions spread evenly.
    'max.poll.interval.ms': 120000,
    kafkaJS: {
      groupId: opts.groupId,
      fromBeginning: true,
      sessionTimeout: 10000,
      heartbeatInterval: 3000,
      partitionAssigners: [ck.KafkaJS.PartitionAssigners.roundRobin],
    },
  });
  await consumer.connect();
  await consumer.subscribe({ topics: [opts.topic] });
  await consumer.run({
    eachMessage: async ({ message }) => {
      await opts.onUpdate(JSON.parse(message.value!.toString()));
    },
  });
  return { stop: () => consumer.disconnect() };
}
