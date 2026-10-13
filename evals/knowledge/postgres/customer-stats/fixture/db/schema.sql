CREATE TABLE customers (
  id   serial PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE orders (
  id          bigserial PRIMARY KEY,
  customer_id int NOT NULL REFERENCES customers(id),
  status      text NOT NULL CHECK (status IN ('pending', 'paid', 'shipped', 'cancelled')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  id         bigserial PRIMARY KEY,
  order_id   bigint NOT NULL REFERENCES orders(id),
  sku        text NOT NULL,
  quantity   int NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL
);
