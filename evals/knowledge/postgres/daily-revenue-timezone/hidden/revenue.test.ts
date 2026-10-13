import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { dailyRevenue } from '../src/revenue.ts';

// Run with TZ=Asia/Tokyo (see task.md check:) so the Node process is in neither the DB's nor the merchant's zone.
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
let tbilisi = 0, la = 0;

before(async () => {
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await pool.query(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  tbilisi = (await pool.query(`INSERT INTO merchants(name, timezone) VALUES ('tb', 'Asia/Tbilisi') RETURNING id`)).rows[0].id;
  la = (await pool.query(`INSERT INTO merchants(name, timezone) VALUES ('la', 'America/Los_Angeles') RETURNING id`)).rows[0].id;
  const o = (m: number, at: string, cents: number, status = 'paid') =>
    pool.query('INSERT INTO orders(merchant_id, status, amount_cents, created_at) VALUES ($1,$2,$3,$4)', [m, status, cents, at]);
  // Tbilisi is UTC+4 all year.
  await o(tbilisi, '2026-03-01T19:59:59Z', 100);    // 2026-03-01 23:59:59 local
  await o(tbilisi, '2026-03-01T21:30:00Z', 1000);   // 2026-03-02 01:30 local
  await o(tbilisi, '2026-03-02T10:00:00Z', 5);      // 2026-03-02 local
  await o(tbilisi, '2026-03-02T11:00:00Z', 777, 'refunded');
  await o(tbilisi, '2026-02-28T20:00:00Z', 9);      // 2026-03-01 00:00 local
  await o(tbilisi, '2026-02-28T19:59:00Z', 40000);  // 2026-02-28 local, outside range
  // LA: DST starts 2026-03-08 (clocks jump 02:00 -> 03:00), so that local day is 23h long.
  await o(la, '2026-03-08T07:30:00Z', 1);  // 2026-03-07 23:30 PST
  await o(la, '2026-03-08T08:30:00Z', 20); // 2026-03-08 00:30 PST
  await o(la, '2026-03-09T06:30:00Z', 300); // 2026-03-08 23:30 PDT
  await o(la, '2026-03-09T07:30:00Z', 4000); // 2026-03-09 00:30 PDT
});
after(() => pool.end());

test('days are the merchant\'s calendar days (east of UTC)', async () => {
  const rows = await dailyRevenue(pool, tbilisi, '2026-03-01', '2026-03-03');
  assert.deepStrictEqual(rows, [
    { day: '2026-03-01', totalCents: 109 },
    { day: '2026-03-02', totalCents: 1005 },
    { day: '2026-03-03', totalCents: 0 },
  ]);
});

test('days are the merchant\'s calendar days (west of UTC, across DST)', async () => {
  const rows = await dailyRevenue(pool, la, '2026-03-07', '2026-03-09');
  assert.deepStrictEqual(rows, [
    { day: '2026-03-07', totalCents: 1 },
    { day: '2026-03-08', totalCents: 320 },
    { day: '2026-03-09', totalCents: 4000 },
  ]);
});

test('single-day range with no sales', async () => {
  assert.deepStrictEqual(await dailyRevenue(pool, tbilisi, '2026-04-01', '2026-04-01'), [{ day: '2026-04-01', totalCents: 0 }]);
});
