import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeClock } from './_clock.ts';
import { placeOrder } from '../src/place-order.ts';

const order = { id: 'ord_1', items: [{ sku: 'A', qty: 2 }], amountCents: 4999, address: '1 Main St' };
const http503 = (svc: string) => Object.assign(new Error(`${svc} responded 503`), { status: 503 });
const timeout = (svc: string) => Object.assign(new Error(`${svc}: no response within 5000 ms`), { code: 'ETIMEDOUT' });

function world(opts: { chargeTimesOutAfterCharging?: boolean; shippingFails?: boolean; refundFailures?: number; releaseFailures?: number } = {}) {
  const reserved = new Set<string>();
  const charged = new Map<string, number>(); // orderId -> cents currently held from the customer
  let refundFailures = opts.refundFailures ?? 0;
  let releaseFailures = opts.releaseFailures ?? 0;
  const log: string[] = [];
  const deps = {
    inventory: {
      async reserve(id: string) { log.push('reserve'); reserved.add(id); },
      async release(id: string) {
        log.push('release');
        if (releaseFailures > 0) { releaseFailures--; throw http503('inventory'); }
        reserved.delete(id);
      },
    },
    payments: {
      async charge(id: string, cents: number) {
        log.push('charge');
        charged.set(id, (charged.get(id) ?? 0) + cents); // the charge goes through...
        if (opts.chargeTimesOutAfterCharging) throw timeout('payments'); // ...but the response is lost
        return { chargeId: `ch_${id}` };
      },
      async refund(id: string) {
        log.push('refund');
        if (refundFailures > 0) { refundFailures--; throw http503('payments'); }
        charged.delete(id);
      },
    },
    shipping: {
      async createShipment(id: string) {
        log.push('ship');
        if (opts.shippingFails) throw http503('shipping');
        return { trackingId: `trk_${id}` };
      },
    },
  };
  return { deps, reserved, charged, log };
}

async function run(t: any, w: ReturnType<typeof world>) {
  const clock = fakeClock(t);
  const s = clock.track(placeOrder(order, w.deps as any));
  await clock.runUntil(s, 10 * 60_000, 50);
  assert.ok(s.settled, 'placeOrder never settled');
  return s;
}

test('happy path completes and undoes nothing', async (t) => {
  const w = world();
  const s = await run(t, w);
  assert.equal(s.value, 'completed');
  assert.equal(w.charged.get(order.id), 4999);
  assert.ok(w.reserved.has(order.id));
  assert.ok(!w.log.includes('refund') && !w.log.includes('release'));
});

test('shipping fails: customer refunded, stock released', async (t) => {
  const w = world({ shippingFails: true });
  const s = await run(t, w);
  assert.equal(s.value, 'cancelled', `expected 'cancelled', got ${s.error ?? s.value}`);
  assert.equal(w.charged.get(order.id) ?? 0, 0, 'customer still charged');
  assert.ok(!w.reserved.has(order.id), 'stock still reserved');
});

test('a charge that timed out but went through is refunded', async (t) => {
  const w = world({ chargeTimesOutAfterCharging: true });
  const s = await run(t, w);
  assert.equal(s.value, 'cancelled', `expected 'cancelled', got ${s.error ?? s.value}`);
  assert.equal(w.charged.get(order.id) ?? 0, 0, 'customer charged for a cancelled order');
  assert.ok(!w.reserved.has(order.id), 'stock still reserved');
});

test('undo survives a payments/inventory deploy window', async (t) => {
  const w = world({ shippingFails: true, refundFailures: 2, releaseFailures: 2 });
  const s = await run(t, w);
  assert.equal(s.value, 'cancelled', `expected 'cancelled', got ${s.error ?? s.value}`);
  assert.equal(w.charged.get(order.id) ?? 0, 0, 'refund was given up after a transient 503');
  assert.ok(!w.reserved.has(order.id), 'release was given up after a transient 503');
});
