CREATE TABLE customers (
  id    serial PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name  text NOT NULL
);

CREATE TABLE products (
  sku         text PRIMARY KEY,
  name        text NOT NULL,
  price_cents int  NOT NULL CHECK (price_cents >= 0),
  stock       int  NOT NULL CHECK (stock >= 0)
);

CREATE TABLE orders (
  id          serial PRIMARY KEY,
  customer_id int NOT NULL REFERENCES customers(id),
  status      text NOT NULL CHECK (status IN ('pending', 'paid', 'shipped', 'cancelled')),
  total_cents int NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  order_id    int  NOT NULL REFERENCES orders(id),
  sku         text NOT NULL REFERENCES products(sku),
  quantity    int  NOT NULL CHECK (quantity > 0),
  price_cents int  NOT NULL,
  PRIMARY KEY (order_id, sku)
);

CREATE TABLE outbox (
  id         bigserial PRIMARY KEY,
  type       text NOT NULL,
  payload    jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at    timestamptz
);
CREATE INDEX outbox_pending_idx ON outbox (id) WHERE sent_at IS NULL;
