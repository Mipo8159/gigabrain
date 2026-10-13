import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Kafka, logLevel } from 'kafkajs';
import { startInvoiceMailer, type Invoice } from '../src/mailer.ts';
import { replayInvoices } from '../src/replay.ts';

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

const inv = (id: string) => ({ key: id, value: JSON.stringify({ invoiceId: id, customerEmail: `${id}@example.com`, amountCents: 100 }) });

test('replay re-mails the whole topic under the mailer group and leaves it caught up', { timeout: 60_000 }, async () => {
  const topic = `${P}billing.invoices`;
  const groupId = `${P}invoice-mailer`;
  const admin = kafka.admin();
  await admin.connect();
  await admin.createTopics({ topics: [{ topic, numPartitions: 2 }], waitForLeaders: true });
  const producer = kafka.producer();
  await producer.connect();
  const committed = async () => {
    const [t] = await admin.fetchOffsets({ groupId, topics: [topic] });
    return t.partitions.reduce((s, p) => s + Math.max(0, Number(p.offset)), 0);
  };

  try {
    // Normal operation: the mailer mails i1..i3 and commits.
    await producer.send({ topic, messages: ['i1', 'i2', 'i3'].map(inv) });
    const first: string[] = [];
    const mailer = await startInvoiceMailer({ topic, groupId, send: async (i: Invoice) => { first.push(i.invoiceId); } });
    await until(() => first.length >= 3 || undefined, 20_000, () => `the mailer to mail 3 invoices (${first})`);
    await mailer.stop(); // scaled to 0
    await until(async () => (await committed()) === 3 || undefined, 10_000, () => 'mailer offsets committed');

    // Invoices that arrive while the mailer is down.
    await producer.send({ topic, messages: ['i4', 'i5'].map(inv) });

    const replayed: string[] = [];
    const r = await replayInvoices({ topic, groupId, send: async (i: Invoice) => { replayed.push(i.invoiceId); } });
    try {
      await until(() => ['i1', 'i2', 'i3', 'i4', 'i5'].every((id) => replayed.includes(id)) || undefined, 20_000,
        () => `the replay to mail i1..i5 (mailed: ${JSON.stringify(replayed)})`);
    } finally {
      await r.stop();
    }
    let last = -1;
    await until(async () => (last = await committed()) === 5 || undefined, 10_000,
      () => `group ${groupId} to be caught up (committed total ${last}, want 5)`);
  } finally {
    await producer.disconnect();
    await admin.deleteTopics({ topics: [topic] }).catch(() => {});
    await admin.disconnect();
  }
});
