import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cartTotal } from '../src/cart.js';

test('no coupon', () => {
  assert.equal(cartTotal([{ sku: 'a', price: 12.5, qty: 2 }, { sku: 'b', price: 0.99, qty: 1 }]), 25.99);
});

test('fixed coupon', () => {
  assert.equal(cartTotal([{ sku: 'a', price: 12.5, qty: 2 }], 'FIVER'), 20);
});

test('percent coupon', () => {
  assert.equal(cartTotal([{ sku: 'a', price: 20, qty: 1 }], 'tenoff'), 18);
});
