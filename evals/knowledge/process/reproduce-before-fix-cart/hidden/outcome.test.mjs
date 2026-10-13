import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cartTotal } from '../src/cart.js';

test('percent coupon applies to the whole quantity', () => {
  assert.equal(cartTotal([{ sku: 'mug', price: 12.5, qty: 3 }], 'TENOFF'), 33.75);
  assert.equal(cartTotal([{ sku: 'a', price: 20, qty: 1 }, { sku: 'b', price: 5, qty: 2 }], 'TENOFF'), 27);
});
test('others unchanged', () => {
  assert.equal(cartTotal([{ sku: 'a', price: 12.5, qty: 2 }], 'FIVER'), 20);
  assert.equal(cartTotal([{ sku: 'a', price: 0.99, qty: 3 }]), 2.97);
});
