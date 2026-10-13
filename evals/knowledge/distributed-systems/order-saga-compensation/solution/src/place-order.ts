import { setTimeout as sleep } from 'node:timers/promises';
import type { Deps, Order } from './services.ts';

type Step = { name: string; run: () => Promise<unknown>; undo: () => Promise<void> };

const UNDO_ATTEMPTS = 8;

// Compensations must not be dropped on a transient failure. They are idempotent, so retrying is safe.
async function undoWithRetry(step: Step): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try { return await step.undo(); } catch (err) {
      if (attempt >= UNDO_ATTEMPTS) throw new Error(`compensation ${step.name} failed`, { cause: err });
      await sleep(Math.random() * Math.min(30_000, 250 * 2 ** attempt));
    }
  }
}

export async function placeOrder(order: Order, deps: Deps): Promise<'completed' | 'cancelled'> {
  const steps: Step[] = [
    { name: 'reserve', run: () => deps.inventory.reserve(order.id, order.items), undo: () => deps.inventory.release(order.id) },
    { name: 'charge', run: () => deps.payments.charge(order.id, order.amountCents), undo: () => deps.payments.refund(order.id) },
    { name: 'ship', run: () => deps.shipping.createShipment(order.id, order.address), undo: async () => {} },
  ];
  // A step counts as "maybe done" as soon as it was attempted: a timeout or lost response may hide a success.
  const attempted: Step[] = [];
  try {
    for (const step of steps) {
      attempted.push(step);
      await step.run();
    }
    return 'completed';
  } catch (failure) {
    const stuck: unknown[] = [];
    for (const step of attempted.reverse()) {
      try { await undoWithRetry(step); } catch (e) { stuck.push(e); }
    }
    if (stuck.length) {
      // Escalate: in production this goes to a durable retry queue / alert, never silently to a log line.
      throw new AggregateError(stuck, `order ${order.id}: compensation incomplete`, { cause: failure });
    }
    return 'cancelled';
  }
}
