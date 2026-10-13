import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Kafka, logLevel } from 'kafkajs';
import { startPaymentsConsumer } from '../src/consumer.ts';

// Unique per test run: the same KAFKA_PREFIX can be reused by an earlier run or by the agent itself.
const P = `${process.env.KAFKA_PREFIX ?? "local_"}${Date.now().toString(36)}_${process.pid}_`;
const kafka = new Kafka({ clientId: 'hidden-test', brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','), logLevel: logLevel.NOTHING });

async function until<T>(f: () => Promise<T | undefined> | T | undefined, ms: number, what: () => string): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const v = await f();
    if (v !== undefined && v !== false) return v as T;
    if (Date.now() > end) throw new Error(`timed out waiting for ${what()}`);
    await new Promise((r) => setTimeout(r, 100));
  }
}

const pay = (paymentId: string, accountId: string) => JSON.stringify({ paymentId, accountId, amountCents: 1000, currency: 'EUR' });

test('dead-letters malformed events, retries DB blips in order, keeps going', { timeout: 60_000 }, async () => {
  const topic = `${P}billing.payments`;
  const dlqTopic = `${P}billing.payments.dlq`;
  const groupId = `${P}ledger`;
  const admin = kafka.admin();
  await admin.connect();
  await admin.createTopics({ topics: [{ topic, numPartitions: 1 }, { topic: dlqTopic, numPartitions: 1 }], waitForLeaders: true });

  const producer = kafka.producer();
  await producer.connect();
  await producer.send({
    topic,
    messages: [
      { key: 'A', value: pay('p1', 'A') },                                       // offset 0
      { key: 'A', value: '{"paymentId":"bad1", amountCents: oops', headers: { 'trace-id': 't-bad' } }, // offset 1
      { key: 'A', value: pay('p2', 'A') },                                       // offset 2: DB blips on this one
      { key: 'A', value: pay('p3', 'A') },                                       // offset 3
      { key: 'B', value: pay('p4', 'B') },                                       // offset 4
    ],
  });
  await producer.disconnect();

  const applied: string[] = [];
  let blipUntil = 0;
  let handle: { stop(): Promise<void> } | undefined;
  const dlq: any[] = [];
  const checker = kafka.consumer({ groupId: `${P}dlq-checker` });
  try {
    handle = await startPaymentsConsumer({
      topic, groupId, dlqTopic,
      apply: async (p) => {
        if (p.paymentId === 'p2') {
          if (blipUntil === 0) blipUntil = Date.now() + 3000; // a ~3 s failover
          if (Date.now() < blipUntil) throw new Error('Connection terminated unexpectedly');
        }
        applied.push(p.paymentId);
      },
    });

    await until(() => ['p1', 'p2', 'p3', 'p4'].every((id) => applied.includes(id)) || undefined, 20_000,
      () => `all valid payments applied (applied so far: ${JSON.stringify(applied)})`);
    const firsts = [...new Set(applied)];
    assert.ok(firsts.indexOf('p2') < firsts.indexOf('p3'), `p3 applied before p2 for the same account: ${JSON.stringify(applied)}`);
    assert.ok(firsts.indexOf('p1') < firsts.indexOf('p2'), `p2 applied before p1: ${JSON.stringify(applied)}`);

    await checker.connect();
    await checker.subscribe({ topics: [dlqTopic], fromBeginning: true });
    await checker.run({ eachMessage: async ({ message }) => { dlq.push(message); } });
    await until(() => dlq.length >= 1 || undefined, 15_000, () => 'a record on the DLQ topic');
    // give a straggler a chance to show up (bounded poll, not a sleep-and-hope)
    const end = Date.now() + 1500;
    while (Date.now() < end && dlq.length < 2) await new Promise((r) => setTimeout(r, 100));

    assert.equal(dlq.length, 1, `only the malformed event belongs on the DLQ, got ${dlq.length}`);
    const m = dlq[0];
    const h = (k: string) => { const v = m.headers?.[k]; return v === undefined ? undefined : (Array.isArray(v) ? v[0] : v).toString(); };
    assert.equal(m.key?.toString(), 'A');
    assert.equal(m.value?.toString(), '{"paymentId":"bad1", amountCents: oops');
    assert.equal(h('dlq-original-topic'), topic);
    assert.equal(h('dlq-original-partition'), '0');
    assert.equal(h('dlq-original-offset'), '1');
    assert.ok(h('dlq-error'), 'dlq-error header');
  } finally {
    await checker.disconnect().catch(() => {});
    await handle?.stop().catch(() => {});
  }
  const [t] = await admin.fetchOffsets({ groupId, topics: [topic] });
  assert.equal(t.partitions[0].offset, '5', 'group should have committed past every event once stopped');
  await admin.deleteTopics({ topics: [topic, dlqTopic] }).catch(() => {});
  await admin.disconnect();
});
