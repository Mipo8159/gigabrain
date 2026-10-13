import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ck from '@confluentinc/kafka-javascript';

const { Kafka, logLevel } = ck.KafkaJS;
// Unique per test run: the same KAFKA_PREFIX can be reused by an earlier run or by the agent itself.
const P = `${process.env.KAFKA_PREFIX ?? "local_"}${Date.now().toString(36)}_${process.pid}_`;
const kafka = new Kafka({ kafkaJS: { brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','), logLevel: logLevel.NOTHING } });

async function until<T>(f: () => Promise<T | undefined> | T | undefined, ms: number, what: () => string): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const v = await f();
    if (v !== undefined && v !== false) return v as T;
    if (Date.now() > end) throw new Error(`timed out waiting for ${what()}`);
    await new Promise((r) => setTimeout(r, 100));
  }
}

test('a rolling deploy neither drops, double-prints nor stalls a partition', { timeout: 90_000 }, async () => {
  const topic = `${P}warehouse.shipments`;
  const groupId = `${P}label-worker`;
  const log = join(mkdtempSync(join(tmpdir(), 'labels-')), 'print.log');
  const lines = () => (existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map((l) => l.split(' ')) : []);
  const doneBy = (id: string) => lines().filter(([k, s]) => k === 'done' && s === id).map(([, , pid]) => Number(pid));
  const startedBy = (id: string) => lines().filter(([k, s]) => k === 'start' && s === id).map(([, , pid]) => Number(pid));

  const admin = kafka.admin();
  await admin.connect();
  await admin.createTopics({ topics: [{ topic, numPartitions: 2 }] });
  const producer = kafka.producer();
  await producer.connect();
  const send = (partition: number, shipmentId: string, delayMs = 50) =>
    producer.send({ topic, messages: [{ partition, key: shipmentId, value: JSON.stringify({ shipmentId, carrier: 'dhl', delayMs }) }] });

  const env = { ...process.env, TOPIC: topic, GROUP_ID: groupId, PRINT_LOG: log };
  const workers: ChildProcess[] = [];
  const exited = new Map<number, number>();
  let output = '';
  const spawnWorker = () => {
    const w = spawn(process.execPath, ['src/worker.ts'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    const keep = (b: Buffer) => { output = (output + b.toString()).slice(-3000); };
    w.stdout!.on('data', keep); w.stderr!.on('data', keep);
    w.on('exit', (code, sig) => { exited.set(w.pid!, Date.now()); output += `\n[worker ${w.pid} exited code=${code} signal=${sig}]`; });
    workers.push(w);
    return w;
  };

  try {
    spawnWorker();
    spawnWorker();

    // Wait until the two workers own one partition each (observed through who prints what).
    let owner0 = 0, owner1 = 0;
    await until(async () => {
      const r = Math.random().toString(36).slice(2, 8);
      await send(0, `warm0-${r}`); await send(1, `warm1-${r}`);
      const t = Date.now() + 2000;
      while (Date.now() < t && (!doneBy(`warm0-${r}`).length || !doneBy(`warm1-${r}`).length)) await new Promise((x) => setTimeout(x, 100));
      [owner0] = doneBy(`warm0-${r}`); [owner1] = doneBy(`warm1-${r}`);
      return (owner0 && owner1 && owner0 !== owner1) || undefined;
    }, 40_000, () => `both workers to be printing (one partition each); worker output tail:\n${output.slice(-1500)}`);

    const victim = workers.find((w) => w.pid === owner0)!;
    const survivor = workers.find((w) => w.pid === owner1)!;

    // A slow label is being printed when the pod gets SIGTERM.
    await send(0, 'slow-1', 2500);
    await until(() => startedBy('slow-1').length > 0 || undefined, 10_000, () => 'slow-1 to start printing');
    victim.kill('SIGTERM');
    await until(() => exited.has(victim.pid!) || undefined, 25_000, () => 'the terminated worker to exit');

    // Traffic keeps coming on both partitions right after the pod is gone.
    const exitAt = exited.get(victim.pid!)!;
    await send(0, 'after-0');
    await send(1, 'after-1');
    await until(() => (doneBy('after-0').length && doneBy('after-1').length) || undefined, 10_000,
      () => `labels on the terminated pod's partition to keep flowing (after-0 done by ${doneBy('after-0')}, after-1 by ${doneBy('after-1')}, ${Date.now() - exitAt} ms after exit)`);
    assert.deepEqual(doneBy('after-0'), [survivor.pid]);

    // Give a possible duplicate print a moment to show up (bounded).
    const t = Date.now() + 3000;
    while (Date.now() < t && startedBy('slow-1').length < 2) await new Promise((x) => setTimeout(x, 100));
    assert.equal(doneBy('slow-1').length, 1, `slow-1 printed ${doneBy('slow-1').length} times`);
    assert.equal(startedBy('slow-1').length, 1, 'slow-1 was started twice (a half-printed label was reprinted)');
    assert.equal(doneBy('after-0').length, 1);
  } finally {
    for (const w of workers) if (!exited.has(w.pid!)) w.kill('SIGKILL');
    await producer.disconnect();
    await admin.deleteTopics({ topics: [topic] }).catch(() => {});
    await admin.disconnect();
  }
});
