CREATE TABLE customers (
  id        text PRIMARY KEY,
  email     text NOT NULL,
  timezone  text NOT NULL DEFAULT 'UTC'   -- IANA, e.g. Europe/Berlin
);

CREATE TABLE plans (
  id           text PRIMARY KEY,
  name         text NOT NULL,
  price_minor  bigint NOT NULL CHECK (price_minor >= 0),
  currency     char(3) NOT NULL,
  interval     text NOT NULL CHECK (interval IN ('month', 'year'))
);

CREATE TABLE subscriptions (
  id            bigserial PRIMARY KEY,
  customer_id   text NOT NULL REFERENCES customers(id),
  plan_id       text NOT NULL REFERENCES plans(id),
  status        text NOT NULL CHECK (status IN ('active', 'past_due', 'cancelled')),
  started_at    timestamptz NOT NULL,
  next_bill_at  timestamptz NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX subscriptions_due ON subscriptions (next_bill_at) WHERE status = 'active';

CREATE TABLE invoices (
  id               bigserial PRIMARY KEY,
  subscription_id  bigint NOT NULL REFERENCES subscriptions(id),
  period_start     timestamptz NOT NULL,
  period_end       timestamptz NOT NULL,
  amount_minor     bigint NOT NULL,
  currency         char(3) NOT NULL,
  status           text NOT NULL CHECK (status IN ('paid', 'failed')),
  payment_id       text,
  failure_reason   text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, period_start)
);
