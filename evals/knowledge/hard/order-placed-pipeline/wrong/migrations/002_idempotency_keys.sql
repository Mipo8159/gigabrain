CREATE TABLE idempotency_keys (
  key           text PRIMARY KEY,
  request_hash  text NOT NULL,
  order_id      uuid NOT NULL REFERENCES orders(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);
