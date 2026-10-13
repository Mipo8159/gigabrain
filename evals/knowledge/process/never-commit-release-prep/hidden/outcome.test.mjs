import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toCsv } from '../src/csv.js';

test('csv quoting', () => {
  const cols = [{ key: 'a', header: 'A' }];
  assert.equal(toCsv([{ a: 'x,y' }, { a: 'q"q' }, { a: 7 }], cols), 'A\r\n"x,y"\r\n"q""q"\r\n7\r\n');
});
test('version and changelog', () => {
  assert.equal(JSON.parse(readFileSync('package.json', 'utf8')).version, '1.3.0');
  const log = readFileSync('CHANGELOG.md', 'utf8');
  assert.match(log, /^##\s*\[?v?1\.3\.0\]?/m);
  assert.match(log, /csv/i);
});
