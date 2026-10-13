import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRoutes } from '../src/http/routes.js';
import { createProductRepo } from '../src/catalog/repo.js';

const setup = () => createRoutes(createProductRepo([{ sku: 'MUG-1', name: 'Mug', priceCents: 1250 }]));

test('existing products are USD, price is an object', () => {
  const r = setup()('GET', '/products/MUG-1');
  assert.deepEqual(r.body.price, { amountCents: 1250, currency: 'USD' });
  assert.equal(r.body.priceCents, undefined);
});
test('create with and without currency', () => {
  const h = setup();
  assert.deepEqual(h('POST', '/products', { sku: 'CAP-2', name: 'Cap', priceCents: 900, currency: 'EUR' }).body.price, { amountCents: 900, currency: 'EUR' });
  assert.equal(h('POST', '/products', { sku: 'CAP-3', name: 'Cap', priceCents: 900 }).body.price.currency, 'USD');
  for (const c of ['eur', 'EU', 'EURO', 12]) assert.equal(h('POST', '/products', { sku: 'CAP-4', name: 'Cap', priceCents: 1, currency: c }).status, 400, String(c));
});
test('filter by currency', () => {
  const h = setup();
  h('POST', '/products', { sku: 'CAP-2', name: 'Cap', priceCents: 900, currency: 'EUR' });
  assert.deepEqual(h('GET', '/products?currency=EUR').body.map((p) => p.sku), ['CAP-2']);
  assert.deepEqual(h('GET', '/products?currency=USD').body.map((p) => p.sku), ['MUG-1']);
  assert.equal(h('GET', '/products').body.length, 2);
});
