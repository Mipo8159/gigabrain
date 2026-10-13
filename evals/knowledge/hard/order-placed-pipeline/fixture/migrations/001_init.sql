CREATE TABLE customers (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  email       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  text NOT NULL REFERENCES customers(id),
  status       text NOT NULL CHECK (status IN ('placed', 'paid', 'cancelled')),
  total_cents  bigint NOT NULL,
  version      int NOT NULL DEFAULT 1,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_customer ON orders (customer_id, created_at DESC);

CREATE TABLE order_items (
  order_id          uuid NOT NULL REFERENCES orders(id),
  line              int NOT NULL,
  sku               text NOT NULL,
  qty               int NOT NULL CHECK (qty > 0),
  unit_price_cents  bigint NOT NULL CHECK (unit_price_cents >= 0),
  PRIMARY KEY (order_id, line)
);

CREATE TABLE outbox (
  id            bigserial PRIMARY KEY,
  topic         text NOT NULL,
  aggregate_id  text NOT NULL,
  event_type    text NOT NULL,
  payload       jsonb NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  published_at  timestamptz
);
CREATE INDEX outbox_unpublished ON outbox (id) WHERE published_at IS NULL;
