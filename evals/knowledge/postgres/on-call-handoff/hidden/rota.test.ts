import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { goOffCall } from '../src/rota.ts';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 6 });
let shift = 0, a = 0, b = 0, c = 0;

before(async () => {
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await pool.query(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  shift = (await pool.query(`INSERT INTO shifts(label) VALUES ('night') RETURNING id`)).rows[0].id;
  const doc = async (n: string) => (await pool.query('INSERT INTO doctors(name, shift_id) VALUES ($1,$2) RETURNING id', [n, shift])).rows[0].id;
  a = await doc('alice'); b = await doc('bob'); c = await doc('carol');
});
after(() => pool.end());

const onCall = async () => (await pool.query('SELECT id FROM doctors WHERE shift_id = $1 AND on_call ORDER BY id', [shift])).rows.map((r) => r.id);

test('sequential: last doctor on call is refused', async () => {
  await pool.query('UPDATE doctors SET on_call = (id <> $1)', [c]);
  assert.equal(await goOffCall(pool, a), true);
  assert.equal(await goOffCall(pool, b), false);
  assert.equal(await goOffCall(pool, a), true, 'already off call');
  assert.deepEqual(await onCall(), [b]);
});

test('simultaneous requests: both calls resolve and one doctor stays on call', async () => {
  for (let round = 0; round < 25; round++) {
    await pool.query('UPDATE doctors SET on_call = (id <> $1)', [c]);
    const results = await Promise.allSettled([goOffCall(pool, a), goOffCall(pool, b)]);
    const errors = results.filter((r) => r.status === 'rejected').map((r: any) => r.reason?.code ?? String(r.reason));
    assert.deepEqual(errors, [], `round ${round}: a request failed instead of being answered`);
    const vals = results.map((r: any) => r.value).sort();
    assert.deepEqual(vals, [false, true], `round ${round}: exactly one request should be refused`);
    assert.equal((await onCall()).length, 1, `round ${round}: invariant broken`);
  }
});
