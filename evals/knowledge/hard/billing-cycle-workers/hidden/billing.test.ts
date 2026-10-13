// Hidden tests for BIL-97. Happy paths first, then one test per trap (named "trap: ...").
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { migrate } from '../src/db/migrate.ts';
import { runBillingCycle } from '../src/billing/run-cycle.ts';
import { PaymentDeclinedError, PaymentTransientError, type ChargeRequest } from '../src/payments/types.ts';

const URL_ = process.env.DATABASE_URL!;
const pool = new pg.Pool({ connectionString: URL_, max: 5 });
const clock = (iso: string) => ({ now: () => new Date(iso) });

type Step = 'ok' | 'declined' | 'down' | 'lost';
// A PSP that deduplicates by Idempotency-Key, like the real one. 'lost' = charged, but the response times out.
class Psp {
  charges: { key: string; customerId: string; amountMinor: number; currency: string; paymentId: string }[] = [];
  byKey = new Map<string, { paymentId: string }>();
  calls: { customerId: string; key: string; at: number }[] = [];
  script = new Map<string, Step[]>();
  delayMs = 0;
  onCall?: () => void;
  async charge(req: ChargeRequest, signal?: AbortSignal) {
    this.calls.push({ customerId: req.customerId, key: req.idempotencyKey, at: performance.now() });
    this.onCall?.();
    const prev = this.byKey.get(req.idempotencyKey);
    const step: Step = prev ? 'ok' : (this.script.get(req.customerId)?.shift() ?? 'ok');
    let rec = prev;
    if (!prev && (step === 'ok' || step === 'lost')) {
      rec = { paymentId: `py_${randomUUID()}` };
      this.byKey.set(req.idempotencyKey, rec);
      this.charges.push({ key: req.idempotencyKey, customerId: req.customerId, amountMinor: req.amountMinor, currency: req.currency, paymentId: rec.paymentId });
    }
    if (this.delayMs) {
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(resolve, this.delayMs);
        signal?.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('aborted', 'AbortError')); }, { once: true });
      });
    }
    if (step === 'declined') throw new PaymentDeclinedError('insufficient_funds');
    if (step === 'down') throw new PaymentTransientError('psp 503');
    if (step === 'lost') throw new PaymentTransientError('timeout');
    return { paymentId: rec!.paymentId };
  }
  chargesOf(customerId: string) { return this.charges.filter((c) => c.customerId === customerId); }
}

async function seed(customerId: string, startedAt: string, nextBillAt: string, timezone = 'UTC') {
  await pool.query('INSERT INTO customers (id, email, timezone) VALUES ($1, $2, $3)', [customerId, `${customerId}@x.test`, timezone]);
  const r = await pool.query(
    `INSERT INTO subscriptions (customer_id, plan_id, status, started_at, next_bill_at) VALUES ($1, 'pro-monthly', 'active', $2, $3) RETURNING id::text`,
    [customerId, startedAt, nextBillAt]);
  return r.rows[0].id as string;
}
async function sub(id: string) {
  const r = await pool.query('SELECT status, next_bill_at FROM subscriptions WHERE id = $1', [id]);
  return { status: r.rows[0].status, next: r.rows[0].next_bill_at.toISOString() };
}
async function invoices(id: string) {
  const r = await pool.query(
    'SELECT period_start, period_end, amount_minor::int AS amount, currency, status, payment_id FROM invoices WHERE subscription_id = $1 ORDER BY period_start', [id]);
  return r.rows.map((x) => ({ start: x.period_start.toISOString(), end: x.period_end.toISOString(), amount: x.amount, currency: x.currency, status: x.status, paymentId: x.payment_id }));
}

before(async () => {
  await migrate(pool);
  await pool.query(`INSERT INTO plans (id, name, price_minor, currency, interval) VALUES ('pro-monthly', 'Pro', 1900, 'EUR', 'month') ON CONFLICT DO NOTHING`);
});
after(async () => { await pool.end(); });

test('happy: renews a due subscription, leaves a future one, declines go past_due', async () => {
  const psp = new Psp();
  const due = await seed('h-due', '2026-01-10T10:00:00Z', '2026-02-10T10:00:00Z');
  const later = await seed('h-later', '2026-01-20T10:00:00Z', '2026-02-20T10:00:00Z');
  const dec = await seed('h-declined', '2026-01-05T10:00:00Z', '2026-02-05T10:00:00Z');
  psp.script.set('h-declined', ['declined']);
  const r = await runBillingCycle({ pool, payments: psp, clock: clock('2026-02-10T12:00:00Z') });
  assert.ok(r.billed >= 1 && r.declined >= 1, JSON.stringify(r));
  const [inv] = await invoices(due);
  assert.deepEqual({ ...inv, paymentId: undefined }, {
    start: '2026-02-10T10:00:00.000Z', end: '2026-03-10T10:00:00.000Z', amount: 1900, currency: 'EUR', status: 'paid', paymentId: undefined });
  assert.equal(inv.paymentId, psp.chargesOf('h-due')[0].paymentId);
  assert.deepEqual(await sub(due), { status: 'active', next: '2026-03-10T10:00:00.000Z' });
  assert.deepEqual(psp.chargesOf('h-due').map((c) => [c.amountMinor, c.currency]), [[1900, 'EUR']]);
  assert.deepEqual(await invoices(later), []);
  assert.equal(psp.chargesOf('h-later').length, 0);
  assert.equal((await sub(dec)).status, 'past_due');
  assert.equal((await invoices(dec))[0]?.status, 'failed');
  assert.equal(psp.calls.filter((c) => c.customerId === 'h-declined').length, 1, 'a decline is never retried');
});

test('happy: PSP down for the whole cycle, the subscription stays due', async () => {
  const psp = new Psp();
  const id = await seed('h-down', '2026-01-11T10:00:00Z', '2026-02-11T10:00:00Z');
  psp.script.set('h-down', ['down', 'down', 'down']);
  const r = await runBillingCycle({ pool, payments: psp, clock: clock('2026-02-11T12:00:00Z') });
  assert.ok(r.deferred >= 1, JSON.stringify(r));
  assert.equal(psp.calls.filter((c) => c.customerId === 'h-down').length, 3);
  assert.deepEqual(await invoices(id), []);
  assert.deepEqual(await sub(id), { status: 'active', next: '2026-02-11T10:00:00.000Z' });
});

test('trap: renewals keep the start day and local time (month ends, DST)', async () => {
  const psp = new Psp();
  // Berlin, subscribed Jan 31 at 09:30 local; the checkout service set the first renewal to Feb 28 09:30.
  const ber = await seed('dst-berlin', '2026-01-31T08:30:00Z', '2026-02-28T08:30:00Z', 'Europe/Berlin');
  // New York, subscribed Jan 15 at 09:00 local.
  const ny = await seed('dst-ny', '2026-01-15T14:00:00Z', '2026-02-15T14:00:00Z', 'America/New_York');
  await runBillingCycle({ pool, payments: psp, clock: clock('2026-02-28T09:00:00Z') });
  assert.equal((await sub(ber)).next, '2026-03-31T07:30:00.000Z', 'Berlin: Mar 31, 09:30 CEST');
  assert.equal((await sub(ny)).next, '2026-03-15T13:00:00.000Z', 'New York: Mar 15, 09:00 EDT');
  await runBillingCycle({ pool, payments: psp, clock: clock('2026-03-31T08:00:00Z') });
  assert.equal((await sub(ber)).next, '2026-04-30T07:30:00.000Z');
  assert.equal((await sub(ny)).next, '2026-04-15T13:00:00.000Z');
  assert.deepEqual((await invoices(ber)).map((i) => [i.start, i.end]), [
    ['2026-02-28T08:30:00.000Z', '2026-03-31T07:30:00.000Z'],
    ['2026-03-31T07:30:00.000Z', '2026-04-30T07:30:00.000Z'],
  ]);
});

test('trap: a charge whose response timed out is not charged again', async () => {
  const psp = new Psp();
  const id = await seed('lost-1', '2026-04-10T09:00:00Z', '2026-05-10T09:00:00Z');
  psp.script.set('lost-1', ['lost']);
  await runBillingCycle({ pool, payments: psp, clock: clock('2026-05-10T09:05:00Z') });
  await runBillingCycle({ pool, payments: psp, clock: clock('2026-05-10T09:06:00Z') });
  assert.equal(psp.chargesOf('lost-1').length, 1, `the card was charged ${psp.chargesOf('lost-1').length} times for one period`);
  const inv = await invoices(id);
  assert.equal(inv.length, 1);
  assert.equal(inv[0].status, 'paid');
  assert.equal(inv[0].paymentId, psp.chargesOf('lost-1')[0].paymentId);
  assert.equal((await sub(id)).next, '2026-06-10T09:00:00.000Z');
});

test('trap: cycles on 3 replicas at once charge each subscription once', async () => {
  const psp = new Psp();
  psp.delayMs = 15;
  const ids: string[] = [];
  for (let i = 0; i < 30; i++) ids.push(await seed(`rep-${i}`, '2026-05-01T10:00:00Z', '2026-06-01T10:00:00Z'));
  const pools = [0, 1, 2].map(() => new pg.Pool({ connectionString: URL_, max: 3 }));
  try {
    await Promise.all(pools.map((p) =>
      runBillingCycle({ pool: p, payments: psp, clock: clock('2026-06-01T10:30:00Z') }).catch((e) => e)));
  } finally {
    await Promise.all(pools.map((p) => p.end()));
  }
  const doubles = ids.map((_, i) => `rep-${i}`).filter((c) => psp.chargesOf(c).length !== 1);
  assert.deepEqual(doubles, [], `customers not charged exactly once: ${doubles.map((c) => `${c}×${psp.chargesOf(c).length}`)}`);
  for (const id of ids) {
    const inv = await invoices(id);
    assert.equal(inv.length, 1);
    assert.equal(inv[0].status, 'paid');
    assert.equal((await sub(id)).next, '2026-07-01T10:00:00.000Z');
  }
});

test('trap: shutdown mid-cycle stops charging, and another replica bills the rest right away', async () => {
  const psp = new Psp();
  psp.delayMs = 150;
  const ids: string[] = [];
  for (let i = 0; i < 10; i++) ids.push(await seed(`sd-${i}`, '2026-05-15T10:00:00Z', '2026-06-15T10:00:00Z'));
  const ac = new AbortController();
  let abortAt = Infinity;
  psp.onCall = () => {
    psp.onCall = undefined;
    setTimeout(() => { abortAt = performance.now(); ac.abort(); }, 50);
  };
  const t0 = performance.now();
  const first = runBillingCycle({ pool, payments: psp, clock: clock('2026-06-15T11:00:00Z') }, ac.signal).catch((e) => e);
  const settled = await Promise.race([first.then(() => true), new Promise((r) => setTimeout(() => r(false), 5000))]);
  assert.ok(settled, 'the cycle did not return within 5 s of SIGTERM');
  const lateCalls = psp.calls.filter((c) => c.at > abortAt + 1);
  assert.deepEqual(lateCalls.map((c) => c.customerId), [],
    `charges started after the shutdown signal (${Math.round(abortAt - t0)} ms into the cycle)`);

  // Another replica's next cycle, right away.
  psp.delayMs = 0;
  const other = new pg.Pool({ connectionString: URL_, max: 3 });
  try {
    await runBillingCycle({ pool: other, payments: psp, clock: clock('2026-06-15T11:00:30Z') });
  } finally {
    await other.end();
  }
  for (let i = 0; i < 10; i++) {
    assert.equal(psp.chargesOf(`sd-${i}`).length, 1, `sd-${i} charged ${psp.chargesOf(`sd-${i}`).length} times`);
    const inv = await invoices(ids[i]);
    assert.equal(inv.length, 1, `sd-${i} was not billed by the other replica`);
    assert.equal(inv[0].status, 'paid');
  }
});
