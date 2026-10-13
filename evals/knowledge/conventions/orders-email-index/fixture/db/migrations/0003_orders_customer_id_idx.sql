-- migrate:no-transaction
CREATE INDEX CONCURRENTLY IF NOT EXISTS orders_customer_id_created_at_idx ON orders (customer_id, created_at DESC);
