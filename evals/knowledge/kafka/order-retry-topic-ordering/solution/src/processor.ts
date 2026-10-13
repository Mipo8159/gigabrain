import type { OrderEvent, RetryTopic } from './events.ts';

export type OrderProcessor = {
  handle(event: OrderEvent): Promise<void>;
  handleRetry(event: OrderEvent): Promise<void>;
};

export function createOrderProcessor(deps: {
  apply: (event: OrderEvent) => Promise<void>;
  retry: RetryTopic;
}): OrderProcessor {
  // A retry topic alone breaks per-key order: later events for the same order would be
  // applied while an earlier one waits on the retry topic. So once an order has an event
  // in retry, every later event for that order is parked behind it (in order) until the
  // retried event succeeds. Other orders are not affected.
  const parked = new Map<string, OrderEvent[]>(); // orderId -> events waiting behind the head (head is in retry)

  async function tryApply(event: OrderEvent): Promise<boolean> {
    try {
      await deps.apply(event);
      return true;
    } catch {
      return false;
    }
  }

  async function drain(orderId: string): Promise<void> {
    const queue = parked.get(orderId)!;
    while (queue.length) {
      const next = queue[0];
      if (!(await tryApply(next))) {
        await deps.retry.send(next); // stays at the head; the rest keep waiting
        return;
      }
      queue.shift();
    }
    parked.delete(orderId);
  }

  return {
    async handle(event) {
      const waiting = parked.get(event.orderId);
      if (waiting) {
        waiting.push(event);
        return;
      }
      if (await tryApply(event)) return;
      parked.set(event.orderId, [event]);
      await deps.retry.send(event);
    },
    async handleRetry(event) {
      const queue = parked.get(event.orderId);
      if (!queue || queue[0].seq !== event.seq) {
        // Not the event we are waiting on (e.g. state lost on restart): best effort.
        if (!(await tryApply(event))) await deps.retry.send(event);
        return;
      }
      await drain(event.orderId);
    },
  };
}
