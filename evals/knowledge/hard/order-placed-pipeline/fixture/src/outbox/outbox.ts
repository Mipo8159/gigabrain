import type pg from 'pg';

export type OutboxEvent = { topic: string; aggregateId: string; eventType: string; payload: unknown };

/** Writes an event to the outbox. Call it inside the transaction that makes the change. */
export async function enqueue(client: pg.PoolClient, e: OutboxEvent): Promise<void> {
  await client.query(
    'INSERT INTO outbox (topic, aggregate_id, event_type, payload) VALUES ($1, $2, $3, $4)',
    [e.topic, e.aggregateId, e.eventType, JSON.stringify(e.payload)],
  );
}
