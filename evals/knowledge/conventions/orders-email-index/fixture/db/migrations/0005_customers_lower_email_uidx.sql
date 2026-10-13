-- migrate:no-transaction
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS customers_lower_email_uidx ON customers (lower(email));
