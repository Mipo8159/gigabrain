CREATE TABLE notes (
  id        serial PRIMARY KEY,
  tenant_id int NOT NULL,
  body      text NOT NULL
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- No tenant set (NULL or '') means no rows.
CREATE POLICY notes_tenant ON notes
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::int)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::int);

GRANT SELECT, INSERT, UPDATE, DELETE ON notes TO app_user;
GRANT USAGE ON SEQUENCE notes_id_seq TO app_user;
