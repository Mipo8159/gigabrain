import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import { writeCsv } from '../src/csv.ts';

function slowSink(hwm = 1024) {
  const chunks: string[] = [];
  let maxBuffered = 0;
  const w = new Writable({
    highWaterMark: hwm,
    write(chunk, _enc, cb) { chunks.push(chunk.toString()); setTimeout(cb, 1); },
  });
  const orig = w.write.bind(w);
  (w as any).write = (...a: any[]) => { const r = orig(...a); maxBuffered = Math.max(maxBuffered, w.writableLength); return r; };
  return { w, chunks, get maxBuffered() { return maxBuffered; } };
}

async function* gen(n: number) { for (let i = 0; i < n; i++) yield { id: i, name: `n${i}`, note: i % 7 === 0 ? 'a,"b"\nc' : 'x' }; }

test('header, rows and RFC 4180 quoting', async () => {
  const s = slowSink(1 << 20);
  await writeCsv(gen(8), s.w);
  const lines = s.chunks.join('').split('\r\n').length > 2 ? s.chunks.join('').split('\r\n') : s.chunks.join('').split('\n');
  assert.equal(lines[0], 'id,name,note');
  assert.match(s.chunks.join(''), /0,n0,"a,""b""\r?\nc"/);
  assert.ok(s.w.writableFinished, 'out must be finished when the promise resolves');
});

test('respects backpressure: never buffers the whole export in memory', async () => {
  const s = slowSink(1024);
  await writeCsv(gen(3000), s.w);
  assert.ok(s.maxBuffered < 64 * 1024, `buffered up to ${s.maxBuffered} bytes; writes must wait for 'drain'`);
});
