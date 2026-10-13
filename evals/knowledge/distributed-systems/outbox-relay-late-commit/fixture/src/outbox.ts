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
