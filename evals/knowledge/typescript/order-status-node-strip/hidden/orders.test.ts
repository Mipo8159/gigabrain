import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OrderService, InvalidTransitionError, OrderNotFoundError, canTransition } from '../src/orders/index.ts';
import { createMemoryOrderRepo } from '../src/orders/repo.ts';

const T0 = new Date('2026-01-01T00:00:00Z');
const T1 = new Date('2026-01-02T00:00:00Z');
const clock = { now: () => T1 };

function setup(status = 'pending') {
  const repo = createMemoryOrderRepo([{ id: 'o1', customerId: 'c1', status, totalCents: 1000, updatedAt: T0 }]);
  return { repo, svc: new OrderService(repo, clock) };
}

test('allowed transitions table', () => {
  const ok: [string, string][] = [['pending', 'paid'], ['pending', 'cancelled'], ['paid', 'shipped'], ['paid', 'cancelled'], ['shipped', 'delivered']];
  const bad: [string, string][] = [['pending', 'shipped'], ['pending', 'delivered'], ['paid', 'pending'], ['shipped', 'cancelled'], ['delivered', 'pending'], ['cancelled', 'paid'], ['delivered', 'cancelled']];
  const can = canTransition as (a: string, b: string) => boolean;
  for (const [a, b] of ok) assert.equal(can(a, b), true, `${a} -> ${b}`);
  for (const [a, b] of bad) assert.equal(can(a, b), false, `${a} -> ${b}`);
});

test('legal transition is saved with the clock time', async () => {
  const { repo, svc } = setup();
  const out = await (svc.transition as (id: string, to: string) => Promise<{ status: string; updatedAt: Date }>).call(svc, 'o1', 'paid');
  assert.equal(out.status, 'paid');
  assert.equal(out.updatedAt.getTime(), T1.getTime());
  const stored = await repo.get('o1');
  assert.equal(stored?.status, 'paid');
  assert.equal(stored?.updatedAt.getTime(), T1.getTime());
});

test('illegal transition throws InvalidTransitionError and saves nothing', async () => {
  const { repo, svc } = setup('delivered');
  const t = svc.transition as (id: string, to: string) => Promise<unknown>;
  await assert.rejects(t.call(svc, 'o1', 'pending'), (e: unknown) => {
    assert.ok(e instanceof InvalidTransitionError);
    assert.equal((e as unknown as { from: string }).from, 'delivered');
    assert.equal((e as unknown as { to: string }).to, 'pending');
    return true;
  });
  assert.equal((await repo.get('o1'))?.status, 'delivered');
});

test('missing order throws OrderNotFoundError', async () => {
  const { svc } = setup();
  const t = svc.transition as (id: string, to: string) => Promise<unknown>;
  await assert.rejects(t.call(svc, 'nope', 'paid'), (e: unknown) => e instanceof OrderNotFoundError);
});
