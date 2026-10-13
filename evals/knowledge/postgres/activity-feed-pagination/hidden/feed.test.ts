import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import pg from 'pg';
import { listEvents } from '../src/feed.ts';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
const T = 7;

before(async () => {
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  const dir = new URL('../db/', import.meta.url);
  await pool.query(readFileSync(new URL('schema.sql', dir), 'utf8'));
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql') && f !== 'schema.sql').sort()) {
    await pool.query(readFileSync(new URL(f, dir), 'utf8'));
  }
  // 1000 events for tenant 7 in 20 ingest batches of 50 (same created_at per batch, microsecond precision),
  // interleaved with another tenant's events. Insert order is shuffled so id order != time order within a batch.
  await pool.query(`
    INSERT INTO events (tenant_id, kind, created_at)
    SELECT CASE WHEN g % 3 = 0 THEN 8 ELSE ${T} END, 'k' || (g % 5),
           timestamptz '2026-03-01 10:00:00.123456+00' + ((g % 20) * interval '1 minute 0.000001 sec')
      FROM generate_series(1, 1500) g
     ORDER BY md5(g::text)`);
});
after(() => pool.end());

async function all(tenant: number, limit: number, onPage?: (n: number) => Promise<void>) {
  const seen: { id: number; createdAt: Date }[] = [];
  let cursor: string | null | undefined = undefined;
  for (let page = 0; page < 500; page++) {
    const res = await listEvents(pool, tenant, { limit, cursor });
    assert.ok(res.items.length <= limit);
    seen.push(...res.items.map((e) => ({ id: Number(e.id), createdAt: new Date(e.createdAt) })));
    if (onPage) await onPage(page);
    if (res.nextCursor == null) return seen;
    assert.ok(res.items.length > 0, 'non-final page must not be empty');
    cursor = res.nextCursor;
  }
  throw new Error('pagination did not terminate');
}

async function expectedIds(tenant: number, maxId = Number.MAX_SAFE_INTEGER) {
  const { rows } = await pool.query('SELECT id FROM events WHERE tenant_id = $1 AND id <= $2', [tenant, maxId]);
  return rows.map((r) => Number(r.id)).sort((a, b) => a - b);
}

test('every event appears exactly once, newest first', async () => {
  const seen = await all(T, 30);
  const ids = seen.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'an event was returned twice');
  assert.deepEqual([...ids].sort((a, b) => a - b), await expectedIds(T), 'events were skipped');
  for (let i = 1; i < seen.length; i++) assert.ok(seen[i - 1].createdAt >= seen[i].createdAt, 'not newest first');
});

test('new events arriving while scrolling do not cause repeats or gaps', async () => {
  const { rows } = await pool.query('SELECT max(id)::int AS m FROM events');
  const before = rows[0].m;
  const seen = await all(T, 25, async (page) => {
    if (page < 6) {
      await pool.query(`INSERT INTO events (tenant_id, kind, created_at) SELECT ${T}, 'new', now() FROM generate_series(1, 7)`);
    }
  });
  const ids = seen.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'an event was returned twice');
  const old = ids.filter((id) => id <= before).sort((a, b) => a - b);
  assert.deepEqual(old, await expectedIds(T, before), 'an existing event was skipped');
});

test('last page has a null cursor and an empty tenant gets an empty page', async () => {
  const res = await listEvents(pool, 999, { limit: 10 });
  assert.deepEqual(res.items, []);
  assert.equal(res.nextCursor, null);
});
