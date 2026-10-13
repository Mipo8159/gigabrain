import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startOrderConsumer } from '../src/consumer.ts';

type Msg = { partition: number; offset: string; order: any };
type Commit = { topic: string; partition: number; offset: string; at: number };

// Minimal stand-in for a kafkajs Consumer: drives eachMessage or eachBatch, records commits.
function fakeConsumer() {
  const commits: Commit[] = [];
  let clock = 0;
  let runCfg: any = null;
  const subs: any[] = [];
  const c: any = {
    commits,
    tick: () => ++clock,
    get runCfg() { return runCfg; },
    subs,
    async connect() {},
    async subscribe(s: any) { subs.push(s); },
    async run(cfg: any) { runCfg = cfg; },
    async commitOffsets(list: any[]) { for (const o of list) commits.push({ ...o, offset: String(o.offset), at: ++clock }); },
    seek() {}, pause() {}, resume() {}, on() { return () => {}; }, async stop() {}, async disconnect() {},
    events: { GROUP_JOIN: 'consumer.group_join', CRASH: 'consumer.crash' },
  };
  // deliver one message the way kafkajs does; resolves/rejects like the handler.
  c.deliver = async (topic: string, m: Msg) => {
    const message = {
      key: Buffer.from(m.order.id), value: Buffer.from(JSON.stringify(m.order)), offset: m.offset,
      timestamp: '0', headers: {}, attributes: 0, size: 0,
    };
    if (runCfg.eachMessage) {
      return runCfg.eachMessage({ topic, partition: m.partition, message, heartbeat: async () => {}, pause: () => () => {} });
    }
    const resolved: string[] = [];
    return runCfg.eachBatch({
      batch: { topic, partition: m.partition, highWatermark: '999999', messages: [message],
        isEmpty: () => false, firstOffset: () => m.offset, lastOffset: () => m.offset, offsetLag: () => '0', offsetLagLow: () => '0' },
      resolveOffset: (o: string) => resolved.push(o),
      heartbeat: async () => {}, pause: () => () => {}, isRunning: () => true, isStale: () => false,
      commitOffsetsIfNecessary: async (o?: any) => { if (o) await c.commitOffsets(o.topics.flatMap((t: any) => t.partitions.map((p: any) => ({ topic: t.topic, ...p })))); },
      uncommittedOffsets: () => ({ topics: [] }),
    });
  };
  return c;
}

function lastCommitted(commits: Commit[], partition: number) {
  const mine = commits.filter((c) => c.partition === partition);
  return mine.length ? mine[mine.length - 1].offset : undefined;
}

const order = (id: string) => ({ id, customerId: 'c1', totalCents: 100 });

test('commits the next offset to read after each saved order, with auto-commit off', async () => {
  const c = fakeConsumer();
  const saved: string[] = [];
  await startOrderConsumer(c, 'orders.placed', async (o) => { saved.push(o.id); });
  assert.ok(c.runCfg, 'consumer.run must be called');
  assert.equal(c.runCfg.autoCommit, false, 'auto-commit must be off');

  await c.deliver('orders.placed', { partition: 0, offset: '41', order: order('a') });
  await c.deliver('orders.placed', { partition: 0, offset: '42', order: order('b') });
  await c.deliver('orders.placed', { partition: 1, offset: '1099', order: order('c') });

  assert.deepEqual(saved, ['a', 'b', 'c']);
  // Restarting from these offsets must neither replay 'b'/'c' nor skip anything after them.
  assert.equal(lastCommitted(c.commits, 0), '43');
  assert.equal(lastCommitted(c.commits, 1), '1100');
  for (const cm of c.commits) assert.equal(cm.topic, 'orders.placed');
});

test('does not commit until save has resolved, and never commits a failed order', async () => {
  const c = fakeConsumer();
  let release!: () => void;
  const gate = new Promise<void>((r) => { release = r; });
  let saveDoneAt = 0;
  await startOrderConsumer(c, 'orders.placed', async (o) => {
    if (o.id === 'slow') { await gate; saveDoneAt = c.tick(); return; }
    if (o.id === 'bad') throw new Error('db down');
  });

  const p = c.deliver('orders.placed', { partition: 0, offset: '7', order: order('slow') });
  await new Promise((r) => setImmediate(r));
  assert.equal(c.commits.length, 0, 'committed before the order was saved');
  release();
  await p;
  assert.equal(lastCommitted(c.commits, 0), '8');
  assert.ok(c.commits.every((cm: Commit) => cm.at > saveDoneAt));

  await assert.rejects(c.deliver('orders.placed', { partition: 0, offset: '8', order: order('bad') }));
  assert.equal(lastCommitted(c.commits, 0), '8', 'a failed order must stay uncommitted so it is retried');
});
