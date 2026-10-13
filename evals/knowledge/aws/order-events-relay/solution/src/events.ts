import { setTimeout as sleep } from 'node:timers/promises';
import { PutEventsCommand, type PutEventsRequestEntry } from '@aws-sdk/client-eventbridge';
import { eventBridge, busName } from './eventbridge.ts';

export type OrderEvent = {
  id: string;
  type: 'OrderPlaced' | 'OrderShipped' | 'OrderCancelled';
  orderId: string;
  payload: Record<string, unknown>;
};

const MAX_ENTRIES = 10; // PutEvents limit per request
const MAX_ROUNDS = 4;
const RETRYABLE = new Set(['ThrottlingException', 'InternalFailure', 'InternalException']);

export async function publishOrderEvents(events: OrderEvent[]): Promise<{ published: string[]; failed: string[] }> {
  const published: string[] = [];
  const failed: string[] = [];
  const toEntry = (e: OrderEvent): PutEventsRequestEntry => ({
    EventBusName: busName(), Source: 'shop.orders', DetailType: e.type,
    Detail: JSON.stringify({ id: e.id, orderId: e.orderId, ...e.payload }),
  });

  for (let i = 0; i < events.length; i += MAX_ENTRIES) {
    let pending = events.slice(i, i + MAX_ENTRIES);
    for (let round = 0; pending.length; round++) {
      if (round === MAX_ROUNDS) { failed.push(...pending.map(e => e.id)); break; }
      if (round) await sleep(50 * 2 ** round * (0.5 + Math.random() / 2));
      let out;
      try {
        out = await eventBridge.send(new PutEventsCommand({ Entries: pending.map(toEntry) }));
      } catch {
        // The SDK already retried; we don't know which entries landed, so leave them all for the next run.
        failed.push(...pending.map(e => e.id));
        break;
      }
      // PutEvents answers 200 even when entries fail: results line up with the request by index.
      const retry: OrderEvent[] = [];
      (out.Entries ?? []).forEach((r, j) => {
        const e = pending[j];
        if (!r.ErrorCode) published.push(e.id);
        else if (RETRYABLE.has(r.ErrorCode)) retry.push(e);
        else failed.push(e.id);
      });
      pending = retry;
    }
  }
  return { published, failed };
}
