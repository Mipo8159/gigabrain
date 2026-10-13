import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, uniqueSlug } from '../src/slug.js';

test('slugify folds accents and punctuation', () => {
  assert.equal(slugify('Crème Brûlée: 10 Tips!'), 'creme-brulee-10-tips');
});
test('uniqueSlug counts up', () => {
  assert.equal(uniqueSlug('Hello World', ['hello-world', 'hello-world-2']), 'hello-world-3');
});
