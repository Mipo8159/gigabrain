import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { getOrCreateTag, setPostTags } from '../src/tags.ts';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
let post = 0;

before(async () => {
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await pool.query(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  post = (await pool.query(`INSERT INTO posts(title) VALUES ('hello') RETURNING id`)).rows[0].id;
});
after(() => pool.end());

test('existing tag returns the same id', async () => {
  const first = await getOrCreateTag(pool, 'postgres');
  const again = await getOrCreateTag(pool, 'postgres');
  assert.equal(typeof first, 'number');
  assert.strictEqual(again, first);
  const other = await getOrCreateTag(pool, 'Postgres');
  assert.notStrictEqual(other, first);
});

test('many workers creating the same new tag all get one id', async () => {
  for (let round = 0; round < 5; round++) {
    const name = `hot-${round}`;
    const results = await Promise.allSettled(Array.from({ length: 10 }, () => getOrCreateTag(pool, name)));
    const errors = results.filter((r) => r.status === 'rejected').map((r: any) => r.reason?.code ?? String(r.reason));
    assert.deepEqual(errors, [], 'no worker may fail');
    const ids = new Set(results.map((r: any) => r.value));
    assert.equal(ids.size, 1);
    const [id] = ids;
    assert.equal(typeof id, 'number');
    const { rows } = await pool.query('SELECT id FROM tags WHERE name = $1', [name]);
    assert.deepEqual(rows.map((r) => r.id), [id]);
  }
});

test('setPostTags handles repeated names from the editor and existing tags', async () => {
  const existing = await getOrCreateTag(pool, 'sql');
  const ids = await setPostTags(pool, post, ['sql', 'news', 'sql', 'news', 'fresh']);
  assert.equal(ids.length, 3);
  assert.ok(ids.includes(existing));
  const { rows } = await pool.query(
    'SELECT t.name FROM post_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.post_id = $1 ORDER BY t.name', [post]);
  assert.deepEqual(rows.map((r) => r.name), ['fresh', 'news', 'sql']);
});

test('setPostTags replaces the previous set', async () => {
  await setPostTags(pool, post, ['a', 'b']);
  await setPostTags(pool, post, ['b', 'c']);
  const { rows } = await pool.query(
    'SELECT t.name FROM post_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.post_id = $1 ORDER BY t.name', [post]);
  assert.deepEqual(rows.map((r) => r.name), ['b', 'c']);
  assert.deepEqual(await setPostTags(pool, post, []), []);
});
