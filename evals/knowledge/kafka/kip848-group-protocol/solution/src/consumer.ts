import { kafka } from './kafka.ts';

export type ShipmentUpdate = { shipmentId: string; status: string; at: string };

export async function startShipmentConsumer(opts: {
  topic: string;
  groupId: string;
  onUpdate: (u: ShipmentUpdate) => Promise<void>;
}): Promise<{ stop(): Promise<void> }> {
  const consumer = kafka.consumer({
    // KIP-848: the broker owns session timeout, heartbeat interval and assignment
    // (group.consumer.session.timeout.ms etc. on the broker). The classic client-side
    // knobs are rejected with this protocol, so they are gone from here.
    'group.protocol': 'consumer',
    'group.remote.assignor': 'uniform',
    'max.poll.interval.ms': 120000,
    kafkaJS: {
      groupId: opts.groupId,
      fromBeginning: true,
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
