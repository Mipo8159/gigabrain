import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { customerStats } from '../src/stats.ts';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
let alice = 0, bob = 0, carol = 0;

before(async () => {
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await pool.query(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  const ins = async (name: string) => (await pool.query('INSERT INTO customers(name) VALUES ($1) RETURNING id', [name])).rows[0].id;
  alice = await ins('alice'); bob = await ins('bob'); carol = await ins('carol');
  const order = async (c: number, status: string, items: [number, string][]) => {
    const id = (await pool.query('INSERT INTO orders(customer_id, status) VALUES ($1,$2) RETURNING id', [c, status])).rows[0].id;
    for (const [q, p] of items) await pool.query('INSERT INTO order_items(order_id, sku, quantity, unit_price) VALUES ($1,$2,$3,$4)', [id, 'sku', q, p]);
  };
  await order(alice, 'paid', [[1, '0.10'], [2, '0.20']]);
  await order(alice, 'shipped', [[3, '19.99']]);
  await order(alice, 'cancelled', [[5, '100.00']]);
  await order(alice, 'pending', [[1, '0.01']]);
  await order(bob, 'paid', [[1, '10.00']]);
});
after(() => pool.end());

test('counts and sums come back as numbers with exact money', async () => {
  const s = await customerStats(pool, alice);
  assert.strictEqual(s.orders, 3);
  assert.strictEqual(s.itemsBought, 7);
  assert.strictEqual(s.spent, '60.48');
  assert.strictEqual(s.isRepeatCustomer, true);
});

test('single order customer is not a repeat customer', async () => {
  const s = await customerStats(pool, bob);
  assert.strictEqual(s.orders, 1);
  assert.strictEqual(s.itemsBought, 1);
  assert.strictEqual(s.spent, '10.00');
  assert.strictEqual(s.isRepeatCustomer, false);
});

test('customer without orders gets zeros', async () => {
  const s = await customerStats(pool, carol);
  assert.strictEqual(s.orders, 0);
  assert.strictEqual(s.itemsBought, 0);
  assert.strictEqual(s.spent, '0.00');
  assert.strictEqual(s.isRepeatCustomer, false);
});
