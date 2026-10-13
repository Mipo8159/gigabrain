CREATE TABLE order_items (
  id          bigserial PRIMARY KEY,
  order_id    bigint NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sku         text NOT NULL,
  quantity    int NOT NULL CHECK (quantity > 0),
  price_cents bigint NOT NULL CHECK (price_cents >= 0)
);
CREATE INDEX order_items_order_id_idx ON order_items (order_id);
