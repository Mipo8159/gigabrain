CREATE TABLE customers (
  id         bigserial PRIMARY KEY,
  email      text NOT NULL,
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
