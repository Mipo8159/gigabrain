CREATE TABLE IF NOT EXISTS tenants (
  id    text PRIMARY KEY,
  name  text NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id         bigserial PRIMARY KEY,
  tenant_id  text NOT NULL DEFAULT current_setting('app.tenant_id') REFERENCES tenants(id),
  placed_at  timestamptz NOT NULL,
  status     text NOT NULL CHECK (status IN ('paid', 'refunded', 'cancelled'))
);
CREATE INDEX IF NOT EXISTS orders_tenant_placed ON orders (tenant_id, placed_at);

CREATE TABLE IF NOT EXISTS order_lines (
  id            bigserial PRIMARY KEY,
  tenant_id     text NOT NULL DEFAULT current_setting('app.tenant_id') REFERENCES tenants(id),
  order_id      bigint NOT NULL REFERENCES orders(id),
  sku           text NOT NULL,
  qty           int NOT NULL CHECK (qty > 0),
  amount_cents  bigint NOT NULL   -- line total actually charged, in cents
);
CREATE INDEX IF NOT EXISTS order_lines_order ON order_lines (order_id);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;
ALTER TABLE order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_lines FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON orders;
CREATE POLICY tenant_isolation ON orders USING (tenant_id = current_setting('app.tenant_id', true));
DROP POLICY IF EXISTS tenant_isolation ON order_lines;
CREATE POLICY tenant_isolation ON order_lines USING (tenant_id = current_setting('app.tenant_id', true));
