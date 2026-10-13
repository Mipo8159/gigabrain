import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb, insertEvent } from '../src/db.ts';
import { listEvents } from '../src/events.ts';

function seed() {
  const db = openDb(':memory:');
  const ts = ['2026-10-01T10:00:00Z', '2026-10-01T11:00:00Z',
    '2026-10-01T12:00:00Z', '2026-10-01T12:00:00Z', '2026-10-01T12:00:00Z', '2026-10-01T12:00:00Z', '2026-10-01T12:00:00Z',
    '2026-10-01T13:00:00Z'];
  // insert out of id order relative to time, so id order != time order
  const order = [2, 7, 0, 3, 5, 1, 4, 6];
  for (const i of order) insertEvent(db, { type: 'comment', actor: `u${i}`, created_at: ts[i] });
  return db;
}

function walk(db: ReturnType<typeof openDb>, limit: number, between?: (page: number) => void) {
  const pages: { id: number; created_at: string }[][] = [];
  let cursor: string | null = null;
  for (let guard = 0; guard < 50; guard++) {
    const r = listEvents(db, { limit, cursor });
    pages.push(r.items.map(e => ({ id: e.id, created_at: e.created_at })));
    if (r.nextCursor == null) return pages;
    between?.(pages.length);
    cursor = r.nextCursor;
  }
  throw new Error('pagination never terminated');
}

for (const limit of [1, 2, 3, 4]) {
  test(`every event appears exactly once, newest first (limit=${limit}, ties on created_at)`, () => {
    const db = seed();
    const all = (db.prepare('SELECT id FROM events').all() as { id: number }[]).map(r => r.id).sort((a, b) => a - b);
    const pages = walk(db, limit);
    const seen = pages.flat();
    assert.deepEqual([...seen.map(e => e.id)].sort((a, b) => a - b), all, `ids seen: ${seen.map(e => e.id)}`);
    for (let i = 1; i < seen.length; i++) assert.ok(seen[i - 1].created_at >= seen[i].created_at, 'not newest first');
    for (const [i, p] of pages.entries()) assert.ok(p.length > 0, `page ${i + 1} is empty`);
    for (const p of pages.slice(0, -1)) assert.equal(p.length, limit);
  });
}

test('rows inserted between page requests do not cause repeats or skips of older rows', () => {
  const db = seed();
  const before = (db.prepare('SELECT id FROM events').all() as { id: number }[]).map(r => r.id);
  const pages = walk(db, 2, () => {
    insertEvent(db, { type: 'like', actor: 'late', created_at: '2026-10-01T14:00:00Z' });
    insertEvent(db, { type: 'like', actor: 'late2', created_at: '2026-10-01T12:00:00Z' });
  });
  const ids = pages.flat().map(e => e.id);
  assert.equal(new Set(ids).size, ids.length, `duplicate ids across pages: ${ids}`);
  for (const id of before) assert.ok(ids.includes(id), `event ${id} was skipped`);
});

test('nextCursor is null exactly when the last row has been returned', () => {
  const db = openDb(':memory:');
  for (let i = 0; i < 4; i++) insertEvent(db, { type: 't', actor: 'a', created_at: `2026-10-01T1${i}:00:00Z` });
  const p1 = listEvents(db, { limit: 2 });
  assert.equal(p1.items.length, 2);
  assert.notEqual(p1.nextCursor, null);
  const p2 = listEvents(db, { limit: 2, cursor: p1.nextCursor });
  assert.equal(p2.items.length, 2);
  assert.equal(p2.nextCursor, null, 'no more rows: nextCursor must be null, not a cursor to an empty page');
  const empty = listEvents(openDb(':memory:'), { limit: 5 });
  assert.deepEqual(empty, { items: [], nextCursor: null });
});
