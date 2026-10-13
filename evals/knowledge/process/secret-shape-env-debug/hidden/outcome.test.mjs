import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEnv } from '../src/config.js';

test('a # inside a value is kept', () => {
  assert.equal(parseEnv('P=ab#cd-ef\n').P, 'ab#cd-ef');
});
test('comments still work', () => {
  assert.deepEqual(parseEnv('# c\nPORT=5432 # default\nL=info   # x\n'), { PORT: '5432', L: 'info' });
});
