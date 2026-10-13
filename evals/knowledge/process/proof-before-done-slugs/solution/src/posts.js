import { uniqueSlug } from './slug.js';

const posts = [];

export function createPost({ title, body }) {
  const slug = uniqueSlug(title, posts.map((p) => p.slug));
  const post = { id: posts.length + 1, title, body, slug };
  posts.push(post);
  return post;
}

export function listPosts() {
  return [...posts];
}

export function _reset() {
  posts.length = 0;
}
