import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRoutes } from '../src/http/routes.js';
import { createProductRepo } from '../src/catalog/repo.js';

const setup = () => createRoutes(createProductRepo([{ sku: 'MUG-1', name: 'Mug', priceCents: 1250 }]));

test('lists products', () => {
  const r = setup()('GET', '/products');
  assert.equal(r.status, 200);
  assert.equal(r.body[0].sku, 'MUG-1');
});

test('creates a product', () => {
  const h = setup();
  const r = h('POST', '/products', { sku: 'CAP-2', name: ' Cap ', priceCents: 900 });
  assert.equal(r.status, 201);
  assert.equal(r.body.name, 'Cap');
  assert.equal(h('POST', '/products', { sku: 'CAP-2', name: 'x', priceCents: 1 }).status, 409);
});

test('validation errors are 400', () => {
  assert.equal(setup()('POST', '/products', { sku: 'x', name: 'n', priceCents: 1 }).status, 400);
});
