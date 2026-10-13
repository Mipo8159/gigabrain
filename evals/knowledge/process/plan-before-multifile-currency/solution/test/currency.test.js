import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRoutes } from '../src/http/routes.js';
import { createProductRepo } from '../src/catalog/repo.js';

test('currency defaults, validates and filters', () => {
  const h = createRoutes(createProductRepo([{ sku: 'MUG-1', name: 'Mug', priceCents: 1250 }]));
  assert.deepEqual(h('GET', '/products/MUG-1').body.price, { amountCents: 1250, currency: 'USD' });
  assert.equal(h('POST', '/products', { sku: 'CAP-2', name: 'Cap', priceCents: 900, currency: 'EUR' }).status, 201);
  assert.equal(h('POST', '/products', { sku: 'CAP-3', name: 'Cap', priceCents: 900, currency: 'eur' }).status, 400);
  assert.deepEqual(h('GET', '/products?currency=EUR').body.map((p) => p.sku), ['CAP-2']);
});
