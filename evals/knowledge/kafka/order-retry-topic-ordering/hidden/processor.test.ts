import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOrderProcessor } from '../src/processor.ts';
import type { OrderEvent } from '../src/events.ts';

const ev = (orderId: string, seq: number): OrderEvent => ({
  orderId, seq, type: (['OrderCreated', 'OrderPaid', 'OrderShipped', 'OrderCancelled'] as const)[seq - 1], payload: {},
});
const id = (e: OrderEvent) => `${e.orderId}${e.seq}`;

function harness(failures: Record<string, number>) {
  const applied: string[] = [];
  const retryTopic: OrderEvent[] = [];
  const left = { ...failures };
  const p = createOrderProcessor({
    apply: async (e) => {
      const k = id(e);
      if ((left[k] ?? 0) > 0) { left[k]--; throw new Error(`warehouse 503 for ${k}`); }
      applied.push(k);
    },
    retry: { send: async (e) => { retryTopic.push(structuredClone(e)); } },
  });
  // The delayed retry consumer: feed the retry topic back in publish order until it is empty.
  async function drainRetryTopic() {
    for (let i = 0; i < 50 && retryTopic.length; i++) await p.handleRetry(retryTopic.shift()!);
    assert.equal(retryTopic.length, 0, 'retry topic never drained');
  }
  return { p, applied, retryTopic, drainRetryTopic };
}

test('a later event for an order never overtakes one waiting in retry', async () => {
  const h = harness({ A1: 1 });
  await h.p.handle(ev('A', 1));
  await h.p.handle(ev('A', 2));
  await h.p.handle(ev('B', 1));
  assert.ok(h.applied.includes('B1'), 'other orders must not wait for order A');
  assert.ok(!h.applied.includes('A2'), 'OrderPaid for A applied before its OrderCreated');
  await h.drainRetryTopic();
  assert.deepEqual(h.applied.filter((k) => k.startsWith('A')), ['A1', 'A2']);
  assert.ok(h.applied.indexOf('B1') < h.applied.indexOf('A1'));

  await h.p.handle(ev('A', 3));
  assert.deepEqual(h.applied.filter((k) => k.startsWith('A')), ['A1', 'A2', 'A3'], 'order A must flow normally again');
  assert.equal(h.retryTopic.length, 0);
});

test('order is kept when the retry itself fails again', async () => {
  const h = harness({ A1: 3 });
  await h.p.handle(ev('A', 1));
  await h.p.handle(ev('A', 2));
  await h.p.handle(ev('B', 1));
  await h.p.handle(ev('A', 3));
  await h.p.handle(ev('B', 2));
  assert.deepEqual(h.applied, ['B1', 'B2']);
  await h.drainRetryTopic();
  assert.deepEqual(h.applied.filter((k) => k.startsWith('A')), ['A1', 'A2', 'A3']);
});

test('a failure in the middle of an order parks only what comes after it', async () => {
  const h = harness({ A2: 1 });
  await h.p.handle(ev('A', 1));
  await h.p.handle(ev('A', 2));
  await h.p.handle(ev('A', 3));
  await h.p.handle(ev('B', 1));
  assert.deepEqual(h.applied, ['A1', 'B1']);
  await h.drainRetryTopic();
  assert.deepEqual(h.applied.filter((k) => k.startsWith('A')), ['A1', 'A2', 'A3']);
});
