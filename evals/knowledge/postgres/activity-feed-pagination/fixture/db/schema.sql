CREATE TABLE events (
  id         bigserial PRIMARY KEY,
  tenant_id  int NOT NULL,
  kind       text NOT NULL,
  payload    jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX events_tenant_created ON events (tenant_id, created_at);
