CREATE TABLE shifts (
  id    serial PRIMARY KEY,
  label text NOT NULL
);

CREATE TABLE doctors (
  id       serial PRIMARY KEY,
  name     text NOT NULL,
  shift_id int NOT NULL REFERENCES shifts(id),
  on_call  boolean NOT NULL DEFAULT true
);
