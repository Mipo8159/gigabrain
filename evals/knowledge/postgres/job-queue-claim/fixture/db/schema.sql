CREATE TABLE jobs (
  id         bigserial PRIMARY KEY,
  payload    jsonb NOT NULL,
  status     text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'failed')),
  attempts   int NOT NULL DEFAULT 0,
  locked_by  text,
  locked_at  timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX jobs_pending ON jobs (created_at, id) WHERE status = 'pending';
