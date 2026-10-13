-- Support lookup by email (findOrdersByEmail). CONCURRENTLY: orders is hot, do not block writes.
CREATE INDEX CONCURRENTLY IF NOT EXISTS orders_lower_email_created_at_idx ON orders (lower(email), created_at DESC);
