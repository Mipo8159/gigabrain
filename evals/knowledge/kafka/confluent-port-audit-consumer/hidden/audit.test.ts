import { test } from 'node:test';
import assert from 'node:assert/strict';
import ck from '@confluentinc/kafka-javascript';
import { startAuditConsumer } from '../src/audit.ts';

const { Kafka, logLevel } = ck.KafkaJS;
// Unique per test run: the same KAFKA_PREFIX can be reused by an earlier run or by the agent itself.
const P = `${process.env.KAFKA_PREFIX ?? "local_"}${Date.now().toString(36)}_${process.pid}_`;
const kafka = new Kafka({ kafkaJS: { brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','), logLevel: logLevel.NOTHING } });

async function until<T>(f: () => Promise<T | undefined> | T | undefined, ms: number, what: string): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const v = await f();
    if (v !== undefined && v !== false) return v as T;
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 100));
  }
}

test('new group reads the full history and commits after each event', { timeout: 40_000 }, async () => {
  const topic = `${P}audit.events`;
  const groupId = `${P}audit-archiver`;
  const admin = kafka.admin();
  await admin.connect();
  await admin.createTopics({ topics: [{ topic, numPartitions: 2 }] });
  const producer = kafka.producer();
  await producer.connect();
  const sent = [1, 2, 3, 4, 5].map((i) => ({ id: `e${i}`, actor: 'u1', action: 'login', at: '2026-10-01T00:00:00Z' }));
  await producer.send({ topic, messages: sent.map((e, i) => ({ key: `k${i}`, value: JSON.stringify(e) })) });
  await producer.disconnect();

  const seen: string[] = [];
  let handle: { stop(): Promise<void> } | undefined;
  try {
    handle = await startAuditConsumer({ topic, groupId, onEvent: async (e) => { seen.push(e.id); } });
    await until(() => seen.length >= 5 || undefined, 25_000, `5 pre-existing events (saw ${seen.length})`);
    assert.deepEqual([...seen].sort(), sent.map((e) => e.id));
    await until(async () => {
      const [t] = await admin.fetchOffsets({ groupId, topics: [topic] });
      const total = t.partitions.reduce((s: number, p: any) => s + Math.max(0, Number(p.offset)), 0);
      return total === 5 || undefined;
    }, 10_000, 'committed offsets to reach the end of the topic');
  } finally {
    await handle?.stop();
    await admin.deleteTopics({ topics: [topic] }).catch(() => {});
    await admin.disconnect();
  }
});
