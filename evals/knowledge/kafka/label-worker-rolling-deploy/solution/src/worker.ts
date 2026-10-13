// Entrypoint of the label-worker Deployment: `node src/worker.ts`.
import { kafka } from './kafka.ts';
import { printLabel, type Shipment } from './labels.ts';

const topic = process.env.TOPIC!;
const groupId = process.env.GROUP_ID!;

const consumer = kafka.consumer({ kafkaJS: { groupId, fromBeginning: true, autoCommit: false } });
let inFlight: Promise<void> | null = null;
let stopping = false;

await consumer.connect();
await consumer.subscribe({ topics: [topic] });
await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    if (stopping) return; // not printed, not committed: the next owner gets it
    const job = (async () => {
      await printLabel(JSON.parse(message.value!.toString()) as Shipment);
      await consumer.commitOffsets([{ topic, partition, offset: (BigInt(message.offset) + 1n).toString() }]);
    })();
    inFlight = job;
    try { await job; } finally { inFlight = null; }
  },
});

// Kubernetes sends SIGTERM and waits terminationGracePeriodSeconds. Without this the process
// dies mid-print and the group keeps our partitions until the session times out (45 s).
// Finish the current label, commit it, then leave the group so partitions move immediately.
async function shutdown() {
  if (stopping) return;
  stopping = true;
  try {
    if (inFlight) await inFlight;
    await consumer.disconnect();
  } finally {
    process.exit(0);
  }
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
