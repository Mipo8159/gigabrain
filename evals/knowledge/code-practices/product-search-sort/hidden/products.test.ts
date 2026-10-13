import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.ts';
import { searchProducts } from '../src/products.ts';
import { ValidationError } from '../src/errors.ts';

function seed() {
  const db = openDb(':memory:');
  const rows: [number, string, number, string][] = [
    [1, '50% off Sale Bundle', 1999, '2026-01-05'], [2, '500 Rubber Bands', 350, '2026-02-01'],
    [3, 'USB_C Cable', 1299, '2026-03-01'], [4, 'USB-C Charger', 2599, '2026-01-20'],
    [5, "O'Neill Wetsuit", 18900, '2026-04-11'], [6, 'Backslash \\ Poster', 900, '2026-02-14'],
    [7, 'Garden Hose 50m', 4200, '2026-05-01'], [8, 'apple corer', 499, '2026-03-15'],
  ];
  const ins = db.prepare('INSERT INTO products (id, name, price_cents, created_at) VALUES (?, ?, ?, ?)');
  for (const r of rows) ins.run(...r);
  db.prepare('INSERT INTO api_keys (id, secret) VALUES (1, ?)').run('sk_live_TOPSECRET');
  return db;
}
const ids = (ps: { id: number }[]) => ps.map(p => p.id).sort((a, b) => a - b);

test('plain substring search, case-insensitive', () => {
  const db = seed();
  assert.deepEqual(ids(searchProducts(db, { q: 'usb' })), [3, 4]);
  assert.deepEqual(ids(searchProducts(db, { q: 'HOSE' })), [7]);
  assert.equal(searchProducts(db, {}).length, 8);
});

test('% in the search text is a literal percent sign', () => {
  const db = seed();
  assert.deepEqual(ids(searchProducts(db, { q: '50%' })), [1]);
  assert.deepEqual(ids(searchProducts(db, { q: '%' })), [1]);
});

test('_ in the search text is a literal underscore', () => {
  const db = seed();
  assert.deepEqual(ids(searchProducts(db, { q: 'usb_c' })), [3]);
  assert.deepEqual(ids(searchProducts(db, { q: '_' })), [3]);
});

test('quotes and backslashes are just text', () => {
  const db = seed();
  assert.deepEqual(ids(searchProducts(db, { q: "o'neill" })), [5]);
  assert.deepEqual(ids(searchProducts(db, { q: '\\' })), [6]);
  assert.deepEqual(ids(searchProducts(db, { q: '\\%' })), []);
});

test('sorting', () => {
  const db = seed();
  assert.deepEqual(searchProducts(db, { sort: 'price' }).map(p => p.id), [2, 8, 6, 3, 1, 4, 7, 5]);
  assert.deepEqual(searchProducts(db, { sort: 'price', dir: 'desc' }).map(p => p.id), [5, 7, 4, 1, 3, 6, 8, 2]);
  assert.deepEqual(searchProducts(db, { sort: 'newest', dir: 'desc', q: 'usb' }).map(p => p.id), [3, 4]);
  assert.deepEqual(searchProducts(db, { sort: 'name', q: 'usb' }).map(p => p.id).length, 2);
});

const evilSort = [
  'price_cents', 'id', 'name; DROP TABLE products', '(CASE WHEN (SELECT substr(secret,1,1) FROM api_keys)=\'s\' THEN price_cents ELSE id END)',
  'price, (SELECT 1)', 'price desc',
];
for (const sort of evilSort) {
  test(`sort=${JSON.stringify(sort)} is rejected`, () => {
    const db = seed();
    assert.throws(() => searchProducts(db, { sort }), ValidationError);
    assert.equal((db.prepare('SELECT count(*) AS n FROM products').get() as { n: number }).n, 8);
  });
}

const evilDir = [
  'desc, (CASE WHEN (SELECT substr(secret,1,1) FROM api_keys)=\'s\' THEN price_cents ELSE id END)',
  'asc; DROP TABLE products', 'sideways', 'asc --',
];
for (const dir of evilDir) {
  test(`dir=${JSON.stringify(dir)} is rejected`, () => {
    const db = seed();
    assert.throws(() => searchProducts(db, { sort: 'price', dir }), ValidationError);
    assert.equal((db.prepare('SELECT count(*) AS n FROM products').get() as { n: number }).n, 8);
  });
}
