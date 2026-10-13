import { test } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { migrate, enqueueEvent, type OutboxEvent } from '../src/outbox.ts';
import { createRelay } from '../src/relay.ts';

const url = process.env.DATABASE_URL!;
let n = 0;

// Every test gets its own schema, so tests can't see each other's rows.
async function freshDb(t: any) {
  const schema = `relay_t${process.pid}_${++n}`;
  const admin = new pg.Client({ connectionString: url });
  await admin.connect();
  await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE; CREATE SCHEMA ${schema}`);
  await admin.end();
  const pool = new pg.Pool({ connectionString: url, max: 5, options: `-c search_path=${schema}` });
  t.after(() => pool.end());
  await migrate(pool);
  return pool;
}

async function insertCommitted(pool: pg.Pool, tag: string) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await enqueueEvent(c, { aggregateId: tag, type: 'OrderPlaced', payload: { tag } });
    await c.query('COMMIT');
  } finally { c.release(); }
}

function recorder(failFirstFor?: string) {
  const got: string[] = [];
  let failed = false;
  const publish = async (e: OutboxEvent) => {
    const tag = (e.payload as any).tag ?? (typeof e.payload === 'string' ? JSON.parse(e.payload).tag : undefined);
    if (tag === failFirstFor && !failed) { failed = true; throw new Error('broker unavailable'); }
    got.push(tag);
  };
  return { got, publish };
}

async function drain(relay: { pollOnce(): Promise<number> }) {
  for (let i = 0; i < 20; i++) {
    let k: number;
    try { k = await relay.pollOnce(); } catch { continue; }
    if (k === 0) return;
  }
}

test('publishes committed events once, and a restarted relay does not republish them', { timeout: 15_000 }, async (t) => {
  const pool = await freshDb(t);
  for (const tag of ['a', 'b', 'c']) await insertCommitted(pool, tag);
  const r1 = recorder();
  await drain(createRelay({ pool, publish: r1.publish, batchSize: 2 }));
  assert.deepEqual([...r1.got].sort(), ['a', 'b', 'c']);
  const r2 = recorder();
  await drain(createRelay({ pool, publish: r2.publish, batchSize: 2 }));
  assert.deepEqual(r2.got, [], 'restarted relay republished already-published events');
});

test('an event whose transaction commits late is still published', { timeout: 15_000 }, async (t) => {
  const pool = await freshDb(t);
  const rec = recorder();
  const relay = createRelay({ pool, publish: rec.publish, batchSize: 100 });

  // Order transaction 1 inserts its outbox row first, but is slow to commit (e.g. waiting on a lock).
  const slow = await pool.connect();
  try {
    await slow.query('BEGIN');
    await enqueueEvent(slow, { aggregateId: 'late', type: 'OrderPlaced', payload: { tag: 'late' } });
    // Order transaction 2 starts later and commits first. The relay keeps polling meanwhile.
    await insertCommitted(pool, 'early');
    await drain(relay);
    await slow.query('COMMIT');
  } finally {
    slow.release();
  }
  // Keep polling for a bit: other transactions on the server may briefly hold a relay back.
  for (let i = 0; i < 30 && !(rec.got.includes('early') && rec.got.includes('late')); i++) {
    await drain(relay);
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.ok(rec.got.includes('early'), `published: ${rec.got.join(', ')}`);
  assert.ok(rec.got.includes('late'), `event committed late was never published (published: ${rec.got.join(', ')})`);
});

test('an event whose publish fails is retried, not skipped', { timeout: 15_000 }, async (t) => {
  const pool = await freshDb(t);
  for (const tag of ['p', 'q', 'r']) await insertCommitted(pool, tag);
  const rec = recorder('q');
  await drain(createRelay({ pool, publish: rec.publish, batchSize: 10 }));
  assert.deepEqual([...new Set(rec.got)].sort(), ['p', 'q', 'r']);
});
