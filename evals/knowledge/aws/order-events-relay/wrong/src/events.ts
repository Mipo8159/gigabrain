import { PutEventsCommand, type PutEventsRequestEntry } from '@aws-sdk/client-eventbridge';
import { eventBridge, busName } from './eventbridge.ts';

export type OrderEvent = {
  id: string;
  type: 'OrderPlaced' | 'OrderShipped' | 'OrderCancelled';
  orderId: string;
  payload: Record<string, unknown>;
};

const MAX_ENTRIES = 10; // PutEvents accepts at most 10 entries per request

function toEntry(e: OrderEvent): PutEventsRequestEntry {
  return {
    EventBusName: busName(),
    Source: 'shop.orders',
    DetailType: e.type,
    Detail: JSON.stringify({ id: e.id, orderId: e.orderId, ...e.payload }),
  };
}

export async function publishOrderEvents(events: OrderEvent[]): Promise<{ published: string[]; failed: string[] }> {
  const published: string[] = [];
  const failed: string[] = [];

  for (let i = 0; i < events.length; i += MAX_ENTRIES) {
    const chunk = events.slice(i, i + MAX_ENTRIES);
    try {
      // The SDK retries throttled requests with backoff before giving up.
      await eventBridge.send(new PutEventsCommand({ Entries: chunk.map(toEntry) }));
      published.push(...chunk.map(e => e.id));
    } catch (err) {
      console.error('PutEvents failed', err);
      failed.push(...chunk.map(e => e.id));
    }
  }

  return { published, failed };
}
