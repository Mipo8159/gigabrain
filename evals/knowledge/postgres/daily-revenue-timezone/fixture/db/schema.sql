CREATE TABLE merchants (
  id       serial PRIMARY KEY,
  name     text NOT NULL,
  timezone text NOT NULL  -- IANA name, e.g. 'Asia/Tbilisi'
);

CREATE TABLE orders (
  id           bigserial PRIMARY KEY,
  merchant_id  int NOT NULL REFERENCES merchants(id),
  status       text NOT NULL CHECK (status IN ('pending', 'paid', 'refunded')),
  amount_cents bigint NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX orders_merchant_created ON orders (merchant_id, created_at);
