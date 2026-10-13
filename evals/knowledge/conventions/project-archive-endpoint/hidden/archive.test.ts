import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApp } from './app-helper.ts';

let app: Awaited<ReturnType<typeof startApp>>;
before(async () => { app = await startApp(); });
after(() => app.close());

const mk = async (name: string) => (await app.call('POST', '/projects', { name })).body;

test('archive and unarchive return the updated project', async () => {
  const p = await mk('Arch 1');
  const a = await app.call('POST', `/projects/${p.id}/archive`);
  assert.equal(a.status, 200);
  assert.equal(a.body.id, p.id);
  assert.ok(typeof a.body.archivedAt === 'string' && !Number.isNaN(Date.parse(a.body.archivedAt)));
  const u = await app.call('POST', `/projects/${p.id}/unarchive`);
  assert.equal(u.status, 200);
  assert.equal(u.body.archivedAt, null);
});

test('archiving twice is a 409 with the documented error body', async () => {
  const p = await mk('Arch 2');
  await app.call('POST', `/projects/${p.id}/archive`);
  const again = await app.call('POST', `/projects/${p.id}/archive`);
  assert.equal(again.status, 409);
  assert.equal(again.body?.error?.code, 'conflict');
});

test('unarchiving an active project is a 409', async () => {
  const p = await mk('Arch 3');
  const r = await app.call('POST', `/projects/${p.id}/unarchive`);
  assert.equal(r.status, 409);
  assert.equal(r.body?.error?.code, 'conflict');
});

test('unknown project is a 404', async () => {
  const r = await app.call('POST', '/projects/p_missing/archive');
  assert.equal(r.status, 404);
  assert.equal(r.body?.error?.code, 'not_found');
});

test('an archived project cannot be renamed until unarchived', async () => {
  const p = await mk('Arch 4');
  await app.call('POST', `/projects/${p.id}/archive`);
  const r = await app.call('PATCH', `/projects/${p.id}`, { name: 'Arch 4b' });
  assert.equal(r.status, 409);
  assert.equal(r.body?.error?.code, 'conflict');
  assert.equal((await app.call('GET', `/projects/${p.id}`)).body.name, 'Arch 4');
  await app.call('POST', `/projects/${p.id}/unarchive`);
  assert.equal((await app.call('PATCH', `/projects/${p.id}`, { name: 'Arch 4b' })).status, 200);
});
