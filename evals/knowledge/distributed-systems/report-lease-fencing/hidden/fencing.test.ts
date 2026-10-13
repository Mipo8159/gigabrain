import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LeaseLock } from '../src/lease-lock.ts';
import { KvStore } from '../src/kv.ts';
import { ReportWorker, getReport } from '../src/reports.ts';

const flush = async (n = 20) => { for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r)); };

function setup() {
  let now = 1_000_000;
  const lock = new LeaseLock(() => now);
  // Writes carrying `stalled` sit in the network until the test lets them through.
  let releaseStalled!: () => void;
  const stalledGate = new Promise<void>((r) => { releaseStalled = r; });
  let stalledInFlight = false;
  const db = new KvStore({
    latency: async (op, _key, item) => {
      if (op === 'put' && JSON.stringify(item ?? {}).includes('stalled')) { stalledInFlight = true; await stalledGate; }
    },
  });
  return {
    lock, db,
    advance: (ms: number) => { now += ms; },
    releaseStalled: () => releaseStalled(),
    get stalledInFlight() { return stalledInFlight; },
  };
}

test('one worker regenerates and stores the report; later runs replace it', async () => {
  const env = setup();
  let v = 0;
  const w = new ReportWorker({ lock: env.lock, db: env.db, render: async () => `v${++v}`, ttlMs: 1000 });
  assert.equal(await w.regenerate('r1'), true);
  assert.equal(await getReport(env.db, 'r1'), 'v1');
  env.advance(10);
  assert.equal(await w.regenerate('r1'), true);
  assert.equal(await getReport(env.db, 'r1'), 'v2');
  const other = new ReportWorker({ lock: env.lock, db: env.db, render: async () => 'from-other', ttlMs: 1000 });
  env.advance(10);
  assert.equal(await other.regenerate('r1'), true);
  assert.equal(await getReport(env.db, 'r1'), 'from-other');
});

test('a second worker skips while the first holds the lock', async () => {
  const env = setup();
  let finish!: (s: string) => void;
  const a = new ReportWorker({ lock: env.lock, db: env.db, render: () => new Promise<string>((r) => { finish = r; }), ttlMs: 30_000 });
  let bRendered = false;
  const b = new ReportWorker({ lock: env.lock, db: env.db, render: async () => { bRendered = true; return 'b'; }, ttlMs: 30_000 });
  const pa = a.regenerate('r2');
  await flush();
  assert.equal(await b.regenerate('r2'), false);
  assert.equal(bRendered, false);
  finish('a');
  assert.equal(await pa, true);
  assert.equal(await getReport(env.db, 'r2'), 'a');
});

test('a worker that stalls past its lease cannot overwrite the newer report', async () => {
  const env = setup();
  const a = new ReportWorker({ lock: env.lock, db: env.db, render: async () => 'stalled-old-snapshot', ttlMs: 1000 });
  const b = new ReportWorker({ lock: env.lock, db: env.db, render: async () => 'fresh-snapshot', ttlMs: 1000 });

  const pa = a.regenerate('r3').catch(() => 'rejected');
  for (let i = 0; i < 50 && !env.stalledInFlight; i++) await flush(1);
  assert.ok(env.stalledInFlight, "worker A never wrote its report");

  env.advance(1500); // A's write is stuck in the network (or A's node stalled) past its 1 s lease
  assert.equal(await b.regenerate('r3'), true, 'B should take the expired lock and regenerate');
  assert.equal(await getReport(env.db, 'r3'), 'fresh-snapshot');

  env.releaseStalled(); // A's delayed write finally reaches the store
  await pa;
  await flush();
  assert.equal(await getReport(env.db, 'r3'), 'fresh-snapshot', "A's stale write replaced B's newer report");
});
