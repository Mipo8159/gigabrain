import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { createClient, type RedisClientType } from 'redis';
import { runWorker, type Job } from '../src/worker.ts';

const url = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
let admin: RedisClientType;
const workers: Array<{ ac: AbortController; client: RedisClientType }> = [];

before(async () => { admin = createClient({ url }) as RedisClientType; admin.on('error', () => {}); await admin.connect(); });
after(() => { for (const w of workers.splice(0)) { w.ac.abort(); w.client.destroy(); } admin.destroy(); });
beforeEach(async () => {
  for (const w of workers.splice(0)) { w.ac.abort(); w.client.destroy(); }
  await admin.flushAll();
});

async function startWorker(consumer: string, handle: (j: Job) => Promise<void>) {
  const client = createClient({ url }) as RedisClientType;
  client.on('error', () => {});
  await client.connect();
  const ac = new AbortController();
  workers.push({ ac, client });
  runWorker({ redis: client, stream: 'thumbs', group: 'thumbers', consumer, handle, signal: ac.signal }).catch(() => {});
  return ac;
}

async function waitFor(cond: () => boolean | Promise<boolean>, ms = 3000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await cond()) return true; await sleep(20); }
  return cond();
}

const pendingCount = async () => {
  const p = await admin.xPending('thumbs', 'thumbers');
  return Number(p.pending);
};

test('processes new jobs once each and acknowledges them', async () => {
  const seen: string[] = [];
  await startWorker('thumbs-0', async (j) => { seen.push(j.fields.imageId); });
  await sleep(100);
  for (let i = 0; i < 5; i++) await admin.xAdd('thumbs', '*', { imageId: `img${i}`, size: '128' });
  assert.ok(await waitFor(() => seen.length >= 5), `handled ${seen.length}/5`);
  await sleep(200);
  assert.deepEqual([...seen].sort(), ['img0', 'img1', 'img2', 'img3', 'img4']);
  assert.ok(await waitFor(async () => (await pendingCount()) === 0), 'all handled jobs should be acknowledged');
});

test('a pod restarted after dying mid-job finishes the job it had taken', async () => {
  // What the pod did before it was OOM-killed: joined the group and took a job, never finished it.
  await admin.xGroupCreate('thumbs', 'thumbers', '0', { MKSTREAM: true });
  await admin.xAdd('thumbs', '*', { imageId: 'interrupted', size: '512' });
  const taken = await admin.xReadGroup('thumbers', 'thumbs-1', { key: 'thumbs', id: '>' }, { COUNT: 1 });
  assert.ok(taken, 'setup: job was delivered to thumbs-1');
  await admin.xAdd('thumbs', '*', { imageId: 'queued-later', size: '128' });

  // The pod comes back with the same name.
  const seen: string[] = [];
  await startWorker('thumbs-1', async (j) => { seen.push(j.fields.imageId); });
  assert.ok(await waitFor(() => seen.length >= 2), `after restart handled: [${seen.join(', ')}]`);
  assert.deepEqual([...seen].sort(), ['interrupted', 'queued-later']);
  assert.ok(await waitFor(async () => (await pendingCount()) === 0), 'the interrupted job must be acknowledged too');
});

test('a group that already exists is reused', async () => {
  await admin.xGroupCreate('thumbs', 'thumbers', '$', { MKSTREAM: true });
  await admin.xAdd('thumbs', '*', { imageId: 'after-group', size: '64' });
  const seen: string[] = [];
  await startWorker('thumbs-2', async (j) => { seen.push(j.fields.imageId); });
  assert.ok(await waitFor(() => seen.length >= 1), 'worker did not process jobs on an existing group');
  assert.deepEqual(seen, ['after-group']);
});
