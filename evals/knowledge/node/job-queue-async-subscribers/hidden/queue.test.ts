import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { JobQueue } from '../src/queue.ts';

const SCRIPT = fileURLToPath(new URL('./support/run-queue.ts', import.meta.url));

test('a failing async subscriber is reported on "error" and the worker keeps running', () => {
  const r = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8', timeout: 5000 });
  assert.equal(r.status, 0, `worker process exited with ${r.status}\n${r.stderr}`);
  const line = r.stdout.trim().split('\n').pop()!;
  const out = JSON.parse(line);
  assert.deepEqual(out.errors, ['job 2 failed']);
  assert.deepEqual(out.done, ['a:1', 'a:3', 'a:4', 'b:1', 'b:2', 'b:3', 'b:4']);
});

test('every subscriber gets every job', async () => {
  const q = new JobQueue();
  const seen: string[] = [];
  q.on('job', async (j) => { seen.push(`x${j.id}`); });
  q.on('job', async (j) => { seen.push(`y${j.id}`); });
  q.enqueue({ id: '1', type: 't', payload: {} });
  q.enqueue({ id: '2', type: 't', payload: {} });
  await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(seen.sort(), ['x1', 'x2', 'y1', 'y2']);
});
