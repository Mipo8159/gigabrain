import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEnv } from '../src/config.js';

test('parses key=value and skips comment lines', () => {
  assert.deepEqual(parseEnv('# hi\nA=1\n\nB = two\n'), { A: '1', B: 'two' });
});

test('strips trailing comments', () => {
  assert.deepEqual(parseEnv('PORT=5432 # default\n'), { PORT: '5432' });
});
