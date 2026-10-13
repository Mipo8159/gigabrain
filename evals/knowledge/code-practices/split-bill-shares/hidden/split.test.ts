import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitBill } from '../src/split.ts';

function check(total: string, cur: string, n: number, expectedSum: number) {
  const parts = splitBill(total, cur, n);
  assert.equal(parts.length, n, `${total} ${cur} / ${n}: got ${parts}`);
  for (const p of parts) assert.ok(Number.isInteger(p), `${total} ${cur}: non-integer share ${p}`);
  assert.equal(parts.reduce((a, b) => a + b, 0), expectedSum, `${total} ${cur} / ${n}: ${parts} does not add up`);
  assert.ok(Math.max(...parts) - Math.min(...parts) <= 1, `${total} ${cur} / ${n}: uneven ${parts}`);
}

test('USD: shares add up to the exact total', () => {
  check('100.00', 'USD', 3, 10000);
  check('100.00', 'USD', 7, 10000);
  check('0.10', 'USD', 3, 10);
  check('0.02', 'USD', 3, 2);
  check('1250', 'USD', 1, 125000);
  check('59.99', 'EUR', 4, 5999);
  check('19.99', 'USD', 6, 1999);
});

test('decimal strings convert exactly', () => {
  check('0.29', 'USD', 1, 29);
  check('4.35', 'USD', 1, 435);
  check('1.15', 'EUR', 1, 115);
  check('1234567.89', 'USD', 1, 123456789);
  check('8.20', 'USD', 1, 820);
});

test('zero-decimal currencies (JPY, CLP)', () => {
  check('1000', 'JPY', 3, 1000);
  check('10000', 'JPY', 7, 10000);
  check('15990', 'CLP', 2, 15990);
});

test('three-decimal currencies (KWD, BHD, OMR)', () => {
  check('1.005', 'KWD', 1, 1005);
  check('10.000', 'KWD', 3, 10000);
  check('12.345', 'BHD', 2, 12345);
  check('7.5', 'OMR', 2, 7500);
});

test('nonsense input is refused', () => {
  assert.throws(() => splitBill('100.00', 'USD', 0));
  assert.throws(() => splitBill('abc', 'USD', 2));
  assert.throws(() => splitBill('-10.00', 'USD', 2));
});
