import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { readNdjson } from '../src/ndjson.ts';

const NAMES = ['თბილისი ღვინო', 'Crème brûlée', '寿司セット 🍣', 'Jalapeño 🌶️ salsa', 'Ελληνικό μέλι', 'plain ascii', '👩‍👩‍👧 family pack'];
const items = Array.from({ length: 300 }, (_, i) => ({ sku: `S${i}`, name: NAMES[i % NAMES.length], tags: i % 3 ? ['ok'] : ['🔥', 'ახალი'] }));

function feedText(): string {
  return items.map((it, i) => JSON.stringify(it) + (i % 4 === 0 ? '\r\n' : '\n') + (i % 50 === 0 ? '\n  \n' : '')).join('').replace(/\n$/, '');
}

async function collect(input: Readable): Promise<unknown[]> {
  const out: unknown[] = [];
  for await (const v of readNdjson(input)) out.push(v);
  return out;
}

function tmpFile(text: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ndjson-'));
  const p = path.join(dir, 'feed.ndjson');
  fs.writeFileSync(p, text);
  return p;
}

test('small ascii feed', async () => {
  const input = Readable.from([Buffer.from('{"a":1}\n\n{"a":2}\r\n{"a":3}')]);
  assert.deepEqual(await collect(input), [{ a: 1 }, { a: 2 }, { a: 3 }]);
});

for (const hwm of [1, 2, 3, 7]) {
  test(`file stream with ${hwm}-byte reads yields exactly the original records`, async () => {
    const p = tmpFile(feedText());
    try {
      assert.deepEqual(await collect(fs.createReadStream(p, { highWaterMark: hwm })), items);
    } finally {
      fs.rmSync(path.dirname(p), { recursive: true, force: true });
    }
  });
}

test('buffer chunks that split characters', async () => {
  const bytes = Buffer.from(feedText());
  const chunks: Buffer[] = [];
  for (let i = 0, k = 0; i < bytes.length; k++) {
    const n = 1 + (k % 5);
    chunks.push(bytes.subarray(i, i + n));
    i += n;
  }
  assert.deepEqual(await collect(Readable.from(chunks)), items);
});

test('invalid JSON line throws', async () => {
  const input = Readable.from([Buffer.from('{"a":1}\n{oops\n{"a":3}\n')]);
  await assert.rejects(collect(input));
});
