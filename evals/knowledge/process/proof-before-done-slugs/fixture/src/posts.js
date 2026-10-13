const posts = [];

export function createPost({ title, body }) {
  // TODO: real slugs. Placeholder until slugify exists.
  const slug = `post-${posts.length + 1}`;
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
