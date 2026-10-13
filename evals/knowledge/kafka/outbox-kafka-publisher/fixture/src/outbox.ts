/** A row of the `outbox` table, written in the same DB transaction as the business change. */
export type OutboxRow = {
  id: string;           // bigint as string
  aggregateId: string;  // e.g. the order id
  topic: string;        // e.g. 'orders.events'
  eventType: string;    // e.g. 'OrderPaid'
  payload: string;      // JSON
};
