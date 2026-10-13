import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import pg from 'pg';
import { LeaderElector } from '../src/leader.ts';

const url = process.env.DATABASE_URL!;
let nextKey = 900_000 + (process.pid % 1000) * 10;

// Each "instance" has its own pool, like a separate process would.
function instance(t: any, poolOpts: pg.PoolConfig = {}) {
  const pool = new pg.Pool({ connectionString: url, max: 4, ...poolOpts });
  pool.on('error', () => {}); // idle clients killed by the server: the pool replaces them
  t.after(() => pool.end());
  return pool;
}

async function admin<T>(sql: string, params: unknown[] = []) {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try { return (await c.query(sql, params)).rows as T[]; } finally { await c.end(); }
}

test('resign hands leadership over while the app keeps using the pool', { timeout: 10_000 }, async (t) => {
  const key = nextKey++;
  const poolA = instance(t);
  const poolB = instance(t);
  const a = new LeaderElector(poolA, key);
  const b = new LeaderElector(poolB, key);
  assert.equal(await a.campaign(), true);
  assert.equal(await b.campaign(), false);

  // Meanwhile instance A serves requests on the same pool.
  const busy = await poolA.connect();
  try {
    await busy.query('SELECT 1');
    await a.resign();
    assert.equal(a.isLeader(), false);
    assert.equal(await b.campaign(), true, 'A resigned, so B must be able to become leader');
  } finally {
    busy.release();
    await b.resign();
  }
});

test('an idle period never produces two leaders', { timeout: 10_000 }, async (t) => {
  const key = nextKey++;
  // Shorter idle timeout than prod (10 s) to keep the test fast; same behaviour.
  const a = new LeaderElector(instance(t, { idleTimeoutMillis: 150 }), key);
  const b = new LeaderElector(instance(t, { idleTimeoutMillis: 150 }), key);
  assert.equal(await a.campaign(), true);
  await new Promise((r) => setTimeout(r, 500));
  const bWon = await b.campaign();
  assert.ok(!(bWon && a.isLeader()), 'split brain: A still believes it is leader and B was elected too');
  await a.resign();
  await b.resign();
});

test('losing the DB connection is reported and frees the lock', { timeout: 10_000 }, async (t) => {
  const key = nextKey++;
  const a = new LeaderElector(instance(t), key);
  const b = new LeaderElector(instance(t), key);
  assert.equal(await a.campaign(), true);

  const holders = await admin<{ pid: number }>(
    "SELECT pid FROM pg_locks WHERE locktype = 'advisory' AND granted AND objid = $1::bigint::oid AND database = (SELECT oid FROM pg_database WHERE datname = current_database())",
    [key]);
  assert.equal(holders.length, 1, 'expected exactly one session to hold the advisory lock');
  const lost = once(a, 'leadershipLost');
  await admin('SELECT pg_terminate_backend($1)', [holders[0].pid]); // e.g. a failover or a proxy restart

  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("no 'leadershipLost' within 2 s")), 2000));
  await Promise.race([lost, timeout]);
  assert.equal(a.isLeader(), false);
  assert.equal(await b.campaign(), true);
  await a.resign();
  await b.resign();
});
