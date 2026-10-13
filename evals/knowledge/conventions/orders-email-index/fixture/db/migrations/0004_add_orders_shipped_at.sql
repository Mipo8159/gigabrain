ALTER TABLE orders ADD COLUMN shipped_at timestamptz;
UPDATE orders SET shipped_at = created_at WHERE status = 'shipped';
