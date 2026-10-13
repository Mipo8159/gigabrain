import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { upsertUser, softDeleteUser } from '../src/users.ts';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 8 });

before(async () => {
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await pool.query(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
});
after(() => pool.end());

const rowsFor = async (email: string) =>
  (await pool.query('SELECT id, name, deleted_at, last_login_at FROM users WHERE email = $1 ORDER BY id', [email])).rows;

test('second login updates the same live user', async () => {
  const id1 = await upsertUser(pool, { email: 'ann@example.com', name: 'Ann' });
  const id2 = await upsertUser(pool, { email: 'ann@example.com', name: 'Ann B.' });
  assert.strictEqual(id2, id1);
  const rows = await rowsFor('ann@example.com');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, 'Ann B.');
  assert.ok(rows[0].last_login_at);
});

test('deleted account is never revived; a new user is created', async () => {
  const old = await upsertUser(pool, { email: 'bo@example.com', name: 'Bo' });
  await softDeleteUser(pool, old);
  const fresh = await upsertUser(pool, { email: 'bo@example.com', name: 'Bo 2' });
  assert.notStrictEqual(fresh, old);
  const again = await upsertUser(pool, { email: 'bo@example.com', name: 'Bo 3' });
  assert.strictEqual(again, fresh);
  const rows = await rowsFor('bo@example.com');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].id, old);
  assert.equal(rows[0].name, 'Bo', 'deleted row must stay untouched');
  assert.ok(rows[0].deleted_at);
  assert.equal(rows[1].deleted_at, null);
  assert.equal(rows[1].name, 'Bo 3');
});

test('callbacks firing at once for the same new person', async () => {
  for (let round = 0; round < 5; round++) {
    const email = `tabs${round}@example.com`;
    const results = await Promise.allSettled(Array.from({ length: 8 }, (_, i) => upsertUser(pool, { email, name: `T${i}` })));
    const errors = results.filter((r) => r.status === 'rejected').map((r: any) => r.reason?.code ?? String(r.reason));
    assert.deepEqual(errors, []);
    const ids = new Set(results.map((r: any) => r.value));
    assert.equal(ids.size, 1);
    const rows = await rowsFor(email);
    assert.equal(rows.length, 1);
  }
});
