import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCsv } from '../src/csv.js';

const cols = [{ key: 'name', header: 'Name' }, { key: 'note', header: 'Note' }];

test('plain rows', () => {
  assert.equal(toCsv([{ name: 'Ann', note: 'ok' }], cols), 'Name,Note\r\nAnn,ok\r\n');
});

test('fields with commas, quotes and newlines are quoted (RFC 4180)', () => {
  assert.equal(
    toCsv([{ name: 'Smith, Jo', note: 'said "hi"\nbye' }], cols),
    'Name,Note\r\n"Smith, Jo","said ""hi""\nbye"\r\n',
  );
});

test('missing values are empty', () => {
  assert.equal(toCsv([{ name: 'Ann' }], cols), 'Name,Note\r\nAnn,\r\n');
});
