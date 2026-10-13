import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp } from './helpers.ts';

let app: Awaited<ReturnType<typeof startApp>>;
before(async () => { app = await startApp(); });
after(() => app.close());

test('create, rename, duplicate name', async () => {
  const a = await app.call('POST', '/projects', { name: 'Alpha' });
  assert.equal(a.status, 201);
  const r = await app.call('PATCH', `/projects/${a.body.id}`, { name: 'Alpha 2' });
  assert.equal(r.body.name, 'Alpha 2');
  const dup = await app.call('POST', '/projects', { name: 'alpha 2' });
  assert.equal(dup.status, 409);
  assert.equal(dup.body.error.code, 'conflict');
});

test('unknown project and empty name', async () => {
  const nf = await app.call('GET', '/projects/p_nope');
  assert.equal(nf.status, 404);
  assert.equal(nf.body.error.code, 'not_found');
  const bad = await app.call('POST', '/projects', { name: ' ' });
  assert.equal(bad.status, 422);
});
