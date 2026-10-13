CREATE TABLE warehouses (
  id    text PRIMARY KEY,
  name  text NOT NULL
);

CREATE TABLE products (
  sku         text PRIMARY KEY,
  name        text NOT NULL,
  stock       bigint NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE imports (
  id            bigserial PRIMARY KEY,
  warehouse_id  text NOT NULL REFERENCES warehouses(id),
  file_key      text NOT NULL,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'failed')),
  rows_done     bigint NOT NULL DEFAULT 0,   -- data records processed (applied or rejected)
  rows_failed   bigint NOT NULL DEFAULT 0,
  error         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  started_at    timestamptz,
  finished_at   timestamptz
);
CREATE INDEX imports_open ON imports (created_at) WHERE status IN ('pending', 'running');

CREATE TABLE import_errors (
  import_id  bigint NOT NULL REFERENCES imports(id),
  record     bigint NOT NULL,
  reason     text NOT NULL,
  PRIMARY KEY (import_id, record)
);
