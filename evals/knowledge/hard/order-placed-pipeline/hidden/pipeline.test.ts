// Hidden tests for ORD-412. Happy paths first, then one test per trap (named "trap: ...").
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import pg from 'pg';
import { createClient } from 'redis';
import { Kafka, logLevel } from 'kafkajs';

process.env.KAFKAJS_NO_PARTITIONER_WARNING = '1';
// Unique per test run: the broker is shared with other runs (and with the agent's own tests).
const P = `${process.env.KAFKA_PREFIX ?? 'local_'}${Date.now().toString(36)}_${process.pid}_`;
const TOPIC = `${P}orders.events`;
process.env.ORDER_EVENTS_TOPIC = TOPIC;

const { createApp } = await import('../src/app.ts');
const { migrate } = await import('../src/db/migrate.ts');
const { markOrderPaid } = await import('../src/orders/pay.ts');
const { loadOrderView } = await import('../src/orders/repo.ts');
const { relayOnce } = await import('../src/outbox/relay.ts');
const { applyOrderEvent, startOrderProjector } = await import('../src/projector/order-projector.ts');
const { orderViewKey } = await import('../src/readmodel/keys.ts');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 20 });
const redis = createClient({ url: process.env.REDIS_URL });
const kafka = new Kafka({ clientId: 'hidden-test', brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','), logLevel: logLevel.NOTHING });

// The app's pool can hold query *results* back (the query itself already ran), to stage a slow read.
const hold = { on: false, waiting: 0, release: () => {}, gate: Promise.resolve() };
function holdable<T extends object>(target: T): T {
  return new Proxy(target, {
    get(t: any, prop) {
      if (prop === 'query') {
        return async (...args: any[]) => {
          const res = await t.query(...args);
          if (hold.on) { hold.waiting++; await hold.gate; }
          return res;
        };
      }
      if (prop === 'connect') {
        return async (...args: any[]) => {
          if (args.length) return t.connect(...args);
          return holdable(await t.connect());
        };
      }
      const v = t[prop];
      return typeof v === 'function' ? v.bind(t) : v;
    },
  });
}
function holdResults() {
  hold.on = true; hold.waiting = 0;
  hold.gate = new Promise<void>((r) => { hold.release = () => { hold.on = false; r(); }; });
}

let server: ReturnType<typeof createApp>;
let base = '';

before(async () => {
  await migrate(pool);
  await redis.connect();
  server = createApp({ pool: holdable(pool), redis });
  await new Promise<void>((r) => server.listen(0, r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  for (const id of ['c-happy', 'c-e2e', 'c-race', 'c-old', 'c-fill']) {
    await pool.query('INSERT INTO customers (id, name, email) VALUES ($1, $1, $1) ON CONFLICT DO NOTHING', [id]);
  }
});

after(async () => {
  hold.release();
  await new Promise((r) => server.close(r));
  await redis.quit();
  await pool.end();
});

const body = (customerId: string, items = [{ sku: 'SKU-1', qty: 2, unitPriceCents: 1250 }, { sku: 'SKU-2', qty: 1, unitPriceCents: 99 }]) =>
  ({ customerId, items });

async function post(b: unknown, key?: string) {
  const r = await fetch(`${base}/orders`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(key ? { 'idempotency-key': key } : {}) },
    body: JSON.stringify(b),
  });
  const text = await r.text();
  return { status: r.status, body: text ? JSON.parse(text) : undefined };
}
async function getOrder(id: string) {
  const r = await fetch(`${base}/orders/${id}`);
  const text = await r.text();
  return { status: r.status, body: text ? JSON.parse(text) : undefined };
}
async function placed(customerId: string) {
  const r = await post(body(customerId), randomUUID());
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body;
}

test('happy: POST /orders creates the order, its event, and GET returns it', async () => {
  const r = await post(body('c-happy'), randomUUID());
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.status, 'placed');
  assert.equal(r.body.version, 1);
  assert.equal(r.body.totalCents, 2599);
  assert.equal(r.body.customerId, 'c-happy');
  const id = r.body.id;
  const ev = await pool.query(`SELECT event_type, topic, payload FROM outbox WHERE aggregate_id = $1`, [id]);
  assert.equal(ev.rowCount, 1);
  assert.equal(ev.rows[0].event_type, 'OrderPlaced');
  assert.equal(ev.rows[0].topic, TOPIC);
  assert.equal(ev.rows[0].payload.version, 1);
  const g = await getOrder(id);
  assert.equal(g.status, 200);
  assert.equal(g.body.id, id);
  assert.equal(g.body.totalCents, 2599);
  assert.equal(g.body.items.length, 2);
});

test('happy: missing key is 400, a key reused with another body is 422, a retry returns the same order', async () => {
  assert.equal((await post(body('c-happy'))).status, 400);
  const key = randomUUID();
  const first = await post(body('c-happy'), key);
  assert.equal(first.status, 201);
  const again = await post(body('c-happy'), key);
  assert.ok(again.status >= 200 && again.status < 300, `retry got ${again.status}`);
  assert.equal(again.body.id, first.body.id);
  const other = await post(body('c-happy', [{ sku: 'SKU-9', qty: 1, unitPriceCents: 1 }]), key);
  assert.equal(other.status, 422);
  assert.equal((await getOrder(randomUUID())).status, 404);
});

test('happy: end to end through Kafka, the paid status reaches the order page', { timeout: 90_000 }, async () => {
  const admin = kafka.admin();
  await admin.connect();
  await admin.createTopics({ topics: [{ topic: TOPIC, numPartitions: 3 }], waitForLeaders: true });
  const producer = kafka.producer();
  await producer.connect();
  const projector = await startOrderProjector({ kafka, redis, topic: TOPIC, groupId: `${P}read-model` });
  try {
    const o = await placed('c-e2e');
    assert.equal((await getOrder(o.id)).body.status, 'placed');
    const paid = await fetch(`${base}/orders/${o.id}/pay`, { method: 'POST' });
    assert.equal(paid.status, 200);
    const end = Date.now() + 40_000;
    let status = '';
    while (Date.now() < end) {
      await relayOnce(pool, producer);
      status = (await getOrder(o.id)).body.status;
      if (status === 'paid') break;
      await new Promise((r) => setTimeout(r, 250));
    }
    assert.equal(status, 'paid', 'the order page still shows the order as placed after it was paid');
    const left = await pool.query(`SELECT count(*)::int AS n FROM outbox WHERE aggregate_id = $1 AND published_at IS NULL`, [o.id]);
    assert.equal(left.rows[0].n, 0);
  } finally {
    await projector.stop();
    await producer.disconnect();
    await admin.deleteTopics({ topics: [TOPIC] }).catch(() => {});
    await admin.disconnect();
  }
});

test('trap: concurrent retries with one Idempotency-Key create exactly one order', async () => {
  const key = randomUUID();
  const rs = await Promise.all(Array.from({ length: 8 }, () => post(body('c-race'), key)));
  const statuses = rs.map((r) => r.status);
  assert.ok(statuses.every((s) => (s >= 200 && s < 300) || s === 409), `statuses: ${statuses}`);
  const ok = rs.filter((r) => r.status >= 200 && r.status < 300);
  assert.ok(ok.length >= 1);
  assert.equal(new Set(ok.map((r) => r.body.id)).size, 1, 'retries got different orders');
  const n = await pool.query(`SELECT count(*)::int AS n FROM orders WHERE customer_id = 'c-race'`);
  assert.equal(n.rows[0].n, 1, 'one key, one order');
  const ev = await pool.query(`SELECT count(*)::int AS n FROM outbox WHERE event_type = 'OrderPlaced' AND aggregate_id = $1`, [ok[0].body.id]);
  assert.equal(ev.rows[0].n, 1);
});

test('trap: two replicas relaying at the same time keep each order in order and publish once', async () => {
  await pool.query('UPDATE outbox SET published_at = now() WHERE published_at IS NULL');
  const acked: { key: string; seq: number }[] = [];
  let release!: () => void;
  const gate = new Promise<void>((r) => { release = r; });
  let gatedCalls = 0;
  function fakeProducer(gated: boolean): any {
    const send = async (msgs: { key?: any; value: any }[]) => {
      if (gated) { gatedCalls++; await gate; } else { await new Promise((r) => setTimeout(r, 2)); }
      for (const m of msgs) {
        const v = JSON.parse(typeof m.value === 'string' ? m.value : m.value.toString());
        acked.push({ key: String(m.key), seq: v.seq });
      }
      return msgs.map(() => ({ topicName: TOPIC, partition: 0, errorCode: 0, baseOffset: '0' }));
    };
    return {
      connect: async () => {}, disconnect: async () => {}, on: () => () => {}, events: {}, isIdempotent: () => false,
      send: ({ messages }: any) => send(messages),
      sendBatch: ({ topicMessages }: any) => send(topicMessages.flatMap((t: any) => t.messages)),
      transaction: async () => { throw new Error('not supported in this test'); },
    };
  }
  const X = `relay-x-${randomUUID()}`, Y = `relay-y-${randomUUID()}`;
  const add = (agg: string, seq: number) => pool.query(
    `INSERT INTO outbox (topic, aggregate_id, event_type, payload) VALUES ($1, $2, 'OrderPaid', $3)`,
    [TOPIC, agg, JSON.stringify({ seq })]);

  await add(X, 1);
  // Replica A picks up X#1; its send is slow (a broker leader election).
  const a = relayOnce(pool, fakeProducer(true));
  for (let i = 0; i < 200 && gatedCalls === 0; i++) await new Promise((r) => setTimeout(r, 10));
  assert.equal(gatedCalls, 1, 'replica A never sent X#1');
  // Meanwhile the order changes again, and replica B's relay ticks.
  await add(X, 2);
  await add(Y, 1);
  const b = relayOnce(pool, fakeProducer(false)).catch((e) => e);
  await Promise.race([b, new Promise((r) => setTimeout(r, 600))]);
  release();
  await a;
  await b;
  for (let i = 0; i < 10; i++) if ((await relayOnce(pool, fakeProducer(false))) === 0) break;

  const seqOf = (k: string) => acked.filter((m) => m.key === k).map((m) => m.seq);
  assert.deepEqual(seqOf(X), [1, 2], `order ${X}: events acknowledged by Kafka as ${JSON.stringify(seqOf(X))}`);
  assert.deepEqual(seqOf(Y), [1]);
  const left = await pool.query('SELECT count(*)::int AS n FROM outbox WHERE published_at IS NULL AND aggregate_id IN ($1, $2)', [X, Y]);
  assert.equal(left.rows[0].n, 0);
});

test('trap: an older event never replaces a newer order page', async () => {
  const o = await placed('c-old');
  const placedEvent = { type: 'OrderPlaced', orderId: o.id, version: 1, occurredAt: new Date().toISOString(), order: o };
  // The order is paid, and the page is loaded from Postgres before the projector caught up.
  await markOrderPaid(pool, o.id);
  await redis.del(orderViewKey(o.id));
  assert.equal((await getOrder(o.id)).body.status, 'paid');
  // Now the (lagging or redelivered) OrderPlaced event reaches the projector.
  await applyOrderEvent(redis, placedEvent as any);
  assert.equal((await getOrder(o.id)).body.status, 'paid', 'the page went back from paid to placed');

  // Same thing purely through events: v2 then a redelivered v1.
  const o2 = await placed('c-old');
  const v2 = (await markOrderPaid(pool, o2.id));
  await applyOrderEvent(redis, { type: 'OrderPaid', orderId: o2.id, version: 2, occurredAt: new Date().toISOString(), order: v2 } as any);
  await applyOrderEvent(redis, { type: 'OrderPlaced', orderId: o2.id, version: 1, occurredAt: new Date().toISOString(), order: o2 } as any);
  assert.equal((await getOrder(o2.id)).body.status, 'paid', 'a redelivered OrderPlaced overwrote OrderPaid');
});

test('trap: a slow cache fill racing the projector does not leave a stale page', async () => {
  const o = await placed('c-fill');
  await redis.del(orderViewKey(o.id));
  // GET misses and reads the order from Postgres (still "placed"); the result is slow to come back.
  holdResults();
  const slowGet = getOrder(o.id);
  for (let i = 0; i < 200 && hold.waiting === 0; i++) await new Promise((r) => setTimeout(r, 10));
  assert.ok(hold.waiting > 0, 'GET /orders/:id did not read Postgres on a miss');
  // Meanwhile the payment lands and the projector applies OrderPaid.
  const paid = await markOrderPaid(pool, o.id);
  await applyOrderEvent(redis, { type: 'OrderPaid', orderId: o.id, version: paid.version, occurredAt: new Date().toISOString(), order: paid } as any);
  hold.release();
  await slowGet;
  // Every later refresh must show the payment.
  assert.equal((await getOrder(o.id)).body.status, 'paid', 'the slow fill put "placed" back over "paid" (and it stays for the TTL)');
});
