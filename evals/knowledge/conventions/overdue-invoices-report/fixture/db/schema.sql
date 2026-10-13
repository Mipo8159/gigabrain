CREATE TABLE tenants (
  id   int PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE customers (
  id        serial PRIMARY KEY,
  tenant_id int NOT NULL REFERENCES tenants(id),
  name      text NOT NULL,
  email     text NOT NULL
);

CREATE TABLE invoices (
  id           serial PRIMARY KEY,
  tenant_id    int NOT NULL REFERENCES tenants(id),
  customer_id  int NOT NULL REFERENCES customers(id),
  number       text NOT NULL,
  status       text NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'void')),
  amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
  issued_on    date NOT NULL,
  due_date     date NOT NULL,
  UNIQUE (tenant_id, number)
);

CREATE TABLE payments (
  id           serial PRIMARY KEY,
  tenant_id    int NOT NULL REFERENCES tenants(id),
  invoice_id   int NOT NULL REFERENCES invoices(id),
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  paid_on      date NOT NULL
);

-- Row-level security: rows of the tenant in app.tenant_id only; no tenant set means no rows.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['customers', 'invoices', 'payments'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY %I ON %I
      USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::int)
      WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::int)$p$, t || '_tenant', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO app_user', t);
    EXECUTE format('GRANT USAGE ON SEQUENCE %I TO app_user', t || '_id_seq');
  END LOOP;
END $$;
GRANT SELECT ON tenants TO app_user;
