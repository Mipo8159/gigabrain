import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BatchWriter } from '../src/batch-writer.ts';
import { requestContext } from '../src/context.ts';
import { log, type LogLine } from '../src/logger.ts';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function capture(): LogLine[] {
  const lines: LogLine[] = [];
  log.write = (l) => { lines.push(l); };
  return lines;
}

function fakeSink(opts: { failWith?: Error } = {}) {
  const calls: unknown[][] = [];
  return {
    calls,
    async writeMany(records: unknown[]) {
      calls.push(records);
      await sleep(2);
      if (opts.failWith) throw opts.failWith;
    },
  };
}

// a request handler as our middleware runs it
function handle(requestId: string, w: BatchWriter, type: string, delayMs = 0): Promise<void> {
  return requestContext.run({ requestId }, async () => {
    if (delayMs) await sleep(delayMs);
    w.add({ type, requestId }, (err) => {
      if (err) log.error('audit write failed', { err: err.message, event: type });
      else log.info('audit saved', { event: type });
    });
  });
}

test('batches by time and by size', async () => {
  const sink = fakeSink();
  const w = new BatchWriter(sink, { maxBatch: 3, flushMs: 20 });
  let done = 0;
  for (let i = 0; i < 7; i++) w.add(i, () => done++);
  await sleep(5);
  assert.deepEqual(sink.calls, [[0, 1, 2], [3, 4, 5]]);
  await sleep(60);
  assert.deepEqual(sink.calls, [[0, 1, 2], [3, 4, 5], [6]]);
  assert.equal(done, 7);
  await w.close();
});

test('close flushes the rest', async () => {
  const sink = fakeSink();
  const w = new BatchWriter(sink, { maxBatch: 100, flushMs: 1000 });
  let done = 0;
  w.add('a', () => done++);
  w.add('b', () => done++);
  await w.close();
  assert.deepEqual(sink.calls, [['a', 'b']]);
  assert.equal(done, 2);
});

test('log lines from onDone carry the request id of the request that added the record (time flush)', async () => {
  const lines = capture();
  const w = new BatchWriter(fakeSink(), { maxBatch: 100, flushMs: 10 });
  await Promise.all([handle('req-A', w, 'login'), handle('req-B', w, 'logout', 1), handle('req-C', w, 'export', 2)]);
  await sleep(50);
  await w.close();
  const byEvent = Object.fromEntries(lines.map((l) => [l.event, l.requestId]));
  assert.deepEqual(byEvent, { login: 'req-A', logout: 'req-B', export: 'req-C' });
});

test('request ids stay correct when the batch is flushed by size, and on errors', async () => {
  const lines = capture();
  const w = new BatchWriter(fakeSink({ failWith: new Error('db down') }), { maxBatch: 3, flushMs: 1000 });
  await Promise.all([handle('req-1', w, 'e1'), handle('req-2', w, 'e2', 1), handle('req-3', w, 'e3', 2)]);
  await sleep(30);
  await w.close();
  assert.equal(lines.length, 3);
  for (const l of lines) assert.equal(l.level, 'error');
  const byEvent = Object.fromEntries(lines.map((l) => [l.event, l.requestId]));
  assert.deepEqual(byEvent, { e1: 'req-1', e2: 'req-2', e3: 'req-3' });
});
