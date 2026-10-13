CREATE TABLE users (
  id            serial PRIMARY KEY,
  email         text NOT NULL,
  name          text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz,
  deleted_at    timestamptz
);

-- One live account per email; deleted accounts keep their email for the audit trail.
CREATE UNIQUE INDEX users_email_live ON users (email) WHERE deleted_at IS NULL;
