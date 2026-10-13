import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Money } from '../src/lib/money.ts';

test('percent rounds half to even', () => {
  assert.equal(Money.of(250, 'EUR').percent(1000).amount, 25);
  assert.equal(Money.of(1050, 'EUR').percent(500).amount, 52);   // 52.5 -> 52
  assert.equal(Money.of(1150, 'EUR').percent(500).amount, 58);   // 57.5 -> 58
});

test('rejects fractional minor units', () => {
  assert.throws(() => Money.of(10.5, 'EUR'), RangeError);
});
