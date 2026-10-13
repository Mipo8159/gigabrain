import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPost, listPosts, _reset } from '../src/posts.js';

test('createPost stores the post', () => {
  _reset();
  const p = createPost({ title: 'First', body: 'hi' });
  assert.equal(p.id, 1);
  assert.equal(listPosts().length, 1);
});
