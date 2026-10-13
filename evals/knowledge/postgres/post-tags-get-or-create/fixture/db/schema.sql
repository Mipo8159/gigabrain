CREATE TABLE posts (
  id    serial PRIMARY KEY,
  title text NOT NULL
);

CREATE TABLE tags (
  id   serial PRIMARY KEY,
  name text NOT NULL UNIQUE
);

CREATE TABLE post_tags (
  post_id int NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id  int NOT NULL REFERENCES tags(id),
  PRIMARY KEY (post_id, tag_id)
);
