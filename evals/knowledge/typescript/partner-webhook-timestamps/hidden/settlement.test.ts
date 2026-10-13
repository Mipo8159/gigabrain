import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSettlement } from '../src/settlement.ts';

const base = {
  id: 'stl_1',
  occurred_at: '2026-10-12T14:03:11.250+04:00',
  settled_at: null,
  amount_cents: 125000,
  currency: 'GEL',
  reference: 'INV-1',
};

const isInvalid = (e: Error) => e.name === 'InvalidPayloadError';

test('parses the documented example, offsets included', () => {
  const s = parseSettlement(base);
  assert.equal(s.id, 'stl_1');
  assert.ok(s.occurredAt instanceof Date);
  assert.equal(s.occurredAt.toISOString(), '2026-10-12T10:03:11.250Z');
  assert.equal(s.settledAt, null);
  assert.equal(s.amountCents, 125000);
  assert.equal(s.currency, 'GEL');
  assert.equal(s.reference, 'INV-1');
});

test('every offset form Paylane uses', () => {
  const cases: [string, string][] = [
    ['2026-10-12T10:03:11Z', '2026-10-12T10:03:11.000Z'],
    ['2026-10-12T05:03:11-05:00', '2026-10-12T10:03:11.000Z'],
    ['2026-10-12T10:03:11.5+00:00', '2026-10-12T10:03:11.500Z'],
  ];
  for (const [wire, iso] of cases) {
    const s = parseSettlement({ ...base, occurred_at: wire, settled_at: wire });
    assert.equal(s.occurredAt.toISOString(), iso, wire);
    assert.equal(s.settledAt?.toISOString(), iso, wire);
  }
});

test('reference is optional and absent when not sent', () => {
  const { reference: _r, ...noRef } = base;
  const s = parseSettlement(noRef);
  assert.equal(Object.hasOwn(s, 'reference'), false);
});

test('rejects timestamps that would have to be guessed', () => {
  const bad: unknown[] = [
    '2026-10-12T10:03:11',      // no offset: local time of which server?
    '2026-10-12',               // date only
    'yesterday',
    '2026-13-12T10:03:11Z',
    1760263391000,
    null,
  ];
  for (const v of bad) {
    assert.throws(() => parseSettlement({ ...base, occurred_at: v }), isInvalid, `occurred_at=${JSON.stringify(v)}`);
  }
  for (const v of ['2026-10-12T10:03:11', '', 0]) {
    assert.throws(() => parseSettlement({ ...base, settled_at: v }), isInvalid, `settled_at=${JSON.stringify(v)}`);
  }
});

test('rejects other bad fields', () => {
  const { occurred_at: _o, ...noOccurred } = base;
  for (const body of [noOccurred, { ...base, amount_cents: 12.5 }, { ...base, amount_cents: '125000' }, { ...base, currency: 'gel' }, { ...base, id: 5 }, null]) {
    assert.throws(() => parseSettlement(body), isInvalid, JSON.stringify(body));
  }
});
