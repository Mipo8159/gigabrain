import { eventBridge, busName } from './eventbridge.ts';

export type OrderEvent = {
  id: string;
  type: 'OrderPlaced' | 'OrderShipped' | 'OrderCancelled';
  orderId: string;
  payload: Record<string, unknown>;
};

export async function publishOrderEvents(events: OrderEvent[]): Promise<{ published: string[]; failed: string[] }> {
  throw new Error('not implemented');
}
