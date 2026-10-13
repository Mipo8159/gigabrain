import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOutboxPublisher } from '../src/publisher.ts';
import type { OutboxRow } from '../src/outbox.ts';

type Logged = { rowId: string; key: string; topic: string; eventType?: string };

// A fake kafkajs `Kafka`: one producer, sends settle asynchronously, chosen rows fail
// (as if the client exhausted its retries during a leader election).
function fakeKafka() {
  const s = {
    configs: [] as any[],
    acked: [] as Logged[],
    failRows: new Set<string>(),
    inFlightKeys: new Map<string, number>(),
    concurrentSameKey: [] as string[],
  };
  const hdr = (h: any) => (h === undefined ? undefined : Buffer.isBuffer(h) ? h.toString() : String(h));
  function producer(cfg: any = {}) {
    s.configs.push(cfg);
    const sendBatch = async ({ topicMessages, acks }: any) => {
      if (cfg.idempotent && acks !== undefined && acks !== -1) throw new Error('Not requiring ack for all messages invalidates the idempotent producer\'s EoS guarantees');
      const msgs: Logged[] = topicMessages.flatMap((tm: any) => tm.messages.map((m: any) => {
        const value = typeof m.value === 'string' ? m.value : m.value?.toString();
        return { rowId: JSON.parse(value).rowId, key: m.key?.toString(), topic: tm.topic, eventType: hdr(m.headers?.['event-type']) };
      }));
      const keys = [...new Set(msgs.map((m) => m.key))];
      for (const k of keys) {
        if ((s.inFlightKeys.get(k) ?? 0) > 0 && cfg.maxInFlightRequests !== 1) s.concurrentSameKey.push(k);
        s.inFlightKeys.set(k, (s.inFlightKeys.get(k) ?? 0) + 1);
      }
      try {
        await new Promise((r) => setTimeout(r, 1));
        if (msgs.some((m) => s.failRows.has(m.rowId))) {
          const e: any = new Error('There is no leader for this topic-partition as we are in the middle of a leadership election');
          e.name = 'KafkaJSNumberOfRetriesExceeded'; e.retriable = false;
          throw e;
        }
        s.acked.push(...msgs);
        return msgs.map((m) => ({ topicName: m.topic, partition: 0, errorCode: 0, baseOffset: '0' }));
      } finally {
        for (const k of keys) s.inFlightKeys.set(k, s.inFlightKeys.get(k)! - 1);
      }
    };
    return {
      connect: async () => {}, disconnect: async () => {}, isIdempotent: () => !!cfg.idempotent,
      on: () => () => {}, events: {}, logger: () => ({ info() {}, warn() {}, error() {}, debug() {} }),
      send: ({ topic, messages, acks, timeout, compression }: any) => sendBatch({ topicMessages: [{ topic, messages }], acks, timeout, compression }),
      sendBatch,
      transaction: async () => { throw new Error('transactions are not used by the relay'); },
    };
  }
  return { kafka: { producer } as any, s };
}

let n = 0;
const row = (aggregateId: string, eventType: string): OutboxRow => {
  const id = String(++n);
  return { id, aggregateId, topic: 'orders.events', eventType, payload: JSON.stringify({ rowId: id, aggregateId, eventType }) };
};
const ids = (rs: OutboxRow[]) => rs.map((r) => r.id);
const ackedFor = (s: any, agg: string) => s.acked.filter((m: Logged) => m.key === agg).map((m: Logged) => m.rowId);

test('publishes keyed, in order, with an idempotent producer', async () => {
  const { kafka, s } = fakeKafka();
  const pub = await createOutboxPublisher(kafka);
  const rows = [row('A', 'OrderCreated'), row('B', 'OrderCreated'), row('A', 'OrderPaid'), row('A', 'OrderShipped'), row('B', 'OrderPaid')];
  const done = await pub.publish(rows);
  await pub.close();

  assert.deepEqual([...done].sort((a, b) => +a - +b), ids(rows));
  assert.ok(s.configs.length >= 1 && s.configs.every((c: any) => c.idempotent === true),
    `producer must not duplicate on internal retries; config was ${JSON.stringify(s.configs)}`);
  assert.deepEqual(ackedFor(s, 'A'), ids(rows.filter((r) => r.aggregateId === 'A')));
  assert.deepEqual(ackedFor(s, 'B'), ids(rows.filter((r) => r.aggregateId === 'B')));
  assert.ok(s.acked.every((m: Logged) => m.topic === 'orders.events'));
  assert.deepEqual(s.acked.map((m: Logged) => m.eventType).sort(), rows.map((r) => r.eventType).sort());
  assert.deepEqual(s.concurrentSameKey, [], 'two sends for the same aggregate were in flight at once; a retry can reorder them');
});

test('a failed row never lets a later row of the same aggregate through', async () => {
  const { kafka, s } = fakeKafka();
  const pub = await createOutboxPublisher(kafka);
  const a1 = row('A', 'OrderCreated'), b1 = row('B', 'OrderCreated'), a2 = row('A', 'OrderPaid'), a3 = row('A', 'OrderShipped'), b2 = row('B', 'OrderPaid');
  s.failRows.add(a2.id);

  const done1 = await pub.publish([a1, b1, a2, a3, b2]);
  const acked1 = s.acked.map((m: Logged) => m.rowId);
  assert.deepEqual([...done1].sort(), [...acked1].sort(), 'return exactly what Kafka acknowledged (anything else is re-sent next tick: a duplicate)');
  assert.ok(!acked1.includes(a3.id), 'OrderShipped reached Kafka while OrderPaid (earlier, same order) did not');

  // Next relay tick: the leader is back, the unpublished rows come again in id order.
  s.failRows.clear();
  const again = [a1, b1, a2, a3, b2].filter((r) => !done1.includes(r.id));
  const done2 = await pub.publish(again);
  await pub.close();
  assert.deepEqual([...done2].sort(), ids(again).sort());
  assert.deepEqual(ackedFor(s, 'A'), [a1.id, a2.id, a3.id], 'each event of an aggregate exactly once, in order');
  assert.deepEqual(ackedFor(s, 'B'), [b1.id, b2.id]);
});

test('does not throw when nothing can be published', async () => {
  const { kafka, s } = fakeKafka();
  const pub = await createOutboxPublisher(kafka);
  const rs = [row('C', 'OrderCreated'), row('C', 'OrderPaid')];
  rs.forEach((r) => s.failRows.add(r.id));
  assert.deepEqual(await pub.publish(rs), []);
  await pub.close();
});
