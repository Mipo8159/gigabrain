import { test } from 'node:test';
import assert from 'node:assert/strict';
import ck from '@confluentinc/kafka-javascript';
import { startShipmentConsumer } from '../src/consumer.ts';

const { Kafka, logLevel, ConsumerGroupTypes } = ck.KafkaJS as any;
// Unique per test run: the same KAFKA_PREFIX can be reused by an earlier run or by the agent itself.
const P = `${process.env.KAFKA_PREFIX ?? "local_"}${Date.now().toString(36)}_${process.pid}_`;
const kafka = new Kafka({ kafkaJS: { brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','), logLevel: logLevel.NOTHING } });

async function until<T>(f: () => Promise<T | undefined> | T | undefined, ms: number, what: () => string): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const v = await f();
    if (v !== undefined && v !== false) return v as T;
    if (Date.now() > end) throw new Error(`timed out waiting for ${what()}`);
    await new Promise((r) => setTimeout(r, 100));
  }
}

test('consumer joins with the KIP-848 group protocol and still consumes', { timeout: 40_000 }, async () => {
  const topic = `${P}logistics.shipment-updates`;
  const groupId = `${P}shipment-tracker`;
  const admin = kafka.admin();
  await admin.connect();
  await admin.createTopics({ topics: [{ topic, numPartitions: 3 }] });
  const producer = kafka.producer();
  await producer.connect();
  await producer.send({ topic, messages: ['s1', 's2', 's3', 's4'].map((id) => ({ key: id, value: JSON.stringify({ shipmentId: id, status: 'picked', at: '2026-10-01' }) })) });

  const seen: string[] = [];
  let handle: { stop(): Promise<void> } | undefined;
  try {
    handle = await startShipmentConsumer({ topic, groupId, onUpdate: async (u) => { seen.push(u.shipmentId); } });
    await until(() => seen.length >= 4 || undefined, 20_000, () => `4 updates (saw ${JSON.stringify(seen)})`);
    assert.deepEqual([...seen].sort(), ['s1', 's2', 's3', 's4']);

    const { groups } = await admin.describeGroups([groupId]);
    assert.equal(groups[0].type, ConsumerGroupTypes.CONSUMER,
      `group type is ${groups[0].type} (CLASSIC=${ConsumerGroupTypes.CLASSIC}); expected the KIP-848 consumer protocol`);

    // still live: a new message is picked up
    await producer.send({ topic, messages: [{ key: 's5', value: JSON.stringify({ shipmentId: 's5', status: 'delivered', at: '2026-10-02' }) }] });
    await until(() => seen.includes('s5') || undefined, 10_000, () => 'a message produced after start');
  } finally {
    await handle?.stop().catch(() => {});
    await producer.disconnect();
    await admin.deleteTopics({ topics: [topic] }).catch(() => {});
    await admin.disconnect();
  }
});
