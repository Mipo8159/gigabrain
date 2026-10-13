import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, uniqueSlug } from '../src/slug.js';
import { createPost, _reset } from '../src/posts.js';

test('slugify basics', () => {
  assert.equal(slugify('Crème Brûlée: 10 Tips!'), 'creme-brulee-10-tips');
  assert.equal(slugify('  --Hello,   World--  '), 'hello-world');
  assert.equal(slugify('🎉🎉'), 'post');
});
test('60 chars at a word boundary', () => {
  const s = slugify('alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu');
  assert.ok(s.length <= 60, s);
  assert.ok(!s.endsWith('-'));
  assert.ok('alpha-beta-gamma-delta-epsilon-zeta-eta-theta-iota-kappa-lambda-mu-nu'.startsWith(s + '-'), s);
});
test('uniqueSlug', () => {
  assert.equal(uniqueSlug('Hello World', []), 'hello-world');
  assert.equal(uniqueSlug('Hello World', ['hello-world', 'hello-world-2']), 'hello-world-3');
});
test('createPost uses unique slugs', () => {
  _reset();
  assert.equal(createPost({ title: 'Hello World', body: '' }).slug, 'hello-world');
  assert.equal(createPost({ title: 'Hello world!', body: '' }).slug, 'hello-world-2');
});
