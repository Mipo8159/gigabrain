import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { claimJobs } from '../src/queue.ts';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10 });

before(async () => {
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await pool.query(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
});
after(() => pool.end());

async function seed(n: number) {
  await pool.query('TRUNCATE jobs RESTART IDENTITY');
  await pool.query(`INSERT INTO jobs (payload, created_at)
    SELECT jsonb_build_object('n', g), timestamptz '2026-01-01' + g * interval '1 second' FROM generate_series(1, $1) g`, [n]);
}

test('claims oldest pending first and marks them running', async () => {
  await seed(5);
  const got = await claimJobs(pool, 'w1', 3);
  assert.deepEqual(got.map((j) => Number(j.id)).sort((a, b) => a - b), [1, 2, 3]);
  assert.ok(got.every((j) => j.attempts === 1));
  const { rows } = await pool.query(`SELECT id, status, locked_by FROM jobs ORDER BY id`);
  assert.deepEqual(rows.map((r) => r.status), ['running', 'running', 'running', 'pending', 'pending']);
  assert.equal(rows[0].locked_by, 'w1');
  assert.equal((await claimJobs(pool, 'w2', 10)).length, 2);
  assert.deepEqual(await claimJobs(pool, 'w2', 10), []);
});

test('8 workers polling at once never get the same job', async () => {
  for (let round = 0; round < 3; round++) {
    await seed(200);
    const claimed: number[] = [];
    const worker = async (w: number) => {
      for (let empty = 0; empty < 3; ) {
        const jobs = await claimJobs(pool, `w${w}`, 10);
        if (jobs.length === 0) { empty++; continue; }
        claimed.push(...jobs.map((j) => Number(j.id)));
      }
    };
    await Promise.all(Array.from({ length: 8 }, (_, w) => worker(w)));
    const dupes = claimed.filter((id, i) => claimed.indexOf(id) !== i);
    assert.deepEqual(dupes, [], `round ${round}: jobs handed to more than one worker`);
    assert.equal(new Set(claimed).size, 200, `round ${round}: some jobs never claimed`);
    const { rows } = await pool.query(`SELECT count(*)::int AS n FROM jobs WHERE status = 'running' AND attempts = 1`);
    assert.equal(rows[0].n, 200);
  }
});

test('a poll while other workers are claiming still gets work when plenty is pending', async () => {
  for (let round = 0; round < 10; round++) {
    await seed(200);
    const batches = await Promise.all(Array.from({ length: 8 }, (_, w) => claimJobs(pool, `w${w}`, 10)));
    const sizes = batches.map((b) => b.length);
    assert.ok(sizes.every((n) => n > 0), `round ${round}: a worker got no jobs while 120+ were pending: ${sizes}`);
    const ids = batches.flat().map((j) => Number(j.id));
    assert.equal(new Set(ids).size, ids.length, `round ${round}: duplicate claims`);
  }
});
