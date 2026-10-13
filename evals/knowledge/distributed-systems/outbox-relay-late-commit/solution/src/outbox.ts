import type pg from 'pg';

export type NewEvent = { aggregateId: string; type: string; payload: unknown };
export type OutboxEvent = { id: string; aggregateId: string; type: string; payload: unknown };

export async function migrate(pool: pg.Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id          text PRIMARY KEY,
      customer_id text NOT NULL,
      total_cents integer NOT NULL,
      created_at  timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS outbox (
      id           bigserial PRIMARY KEY,
      aggregate_id text NOT NULL,
      type         text NOT NULL,
      payload      jsonb NOT NULL,
      created_at   timestamptz NOT NULL DEFAULT now()
    );
    -- Ids are handed out at INSERT but become visible at COMMIT, so id order is not commit order.
    -- The writing transaction's id lets the relay read in an order that late commits cannot jump behind.
    ALTER TABLE outbox ADD COLUMN IF NOT EXISTS tx_id xid8 NOT NULL DEFAULT pg_current_xact_id();
    CREATE INDEX IF NOT EXISTS outbox_tx_id_id ON outbox (tx_id, id);
    CREATE TABLE IF NOT EXISTS outbox_relay_position (
      relay   text PRIMARY KEY,
      tx_id   xid8 NOT NULL,
      last_id bigint NOT NULL
    );
  `);
}

/** Append an event. Must be called inside the caller's transaction, on the caller's client. */
export async function enqueueEvent(client: pg.ClientBase, e: NewEvent): Promise<void> {
  await client.query('INSERT INTO outbox (aggregate_id, type, payload) VALUES ($1, $2, $3)', [
    e.aggregateId,
    e.type,
    JSON.stringify(e.payload),
  ]);
}
