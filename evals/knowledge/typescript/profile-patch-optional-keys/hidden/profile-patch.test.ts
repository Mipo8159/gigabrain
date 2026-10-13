import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseProfilePatch, patchProfile } from '../src/profile-patch.ts';
import { MemoryProfileRepo } from '../src/memory-repo.ts';
import type { Profile } from '../src/domain.ts';

const T0 = new Date('2026-01-01T00:00:00Z');
const T1 = new Date('2026-02-01T00:00:00Z');

function seeded() {
  const repo = new MemoryProfileRepo(() => T1);
  const row: Profile = { id: 'p1', displayName: 'Nino', bio: 'hello', timezone: 'Asia/Tbilisi', marketingOptIn: true, updatedAt: T0 };
  repo.rows.set('p1', row);
  return repo;
}

test('a partial patch carries only the keys that were sent', () => {
  const p = parseProfilePatch({ bio: null });
  assert.equal(p.bio, null);
  for (const k of ['displayName', 'timezone', 'marketingOptIn']) {
    assert.equal(Object.hasOwn(p, k), false, `patch must not contain key "${k}" when the client did not send it`);
  }
  const q = parseProfilePatch({ display_name: 'Giga' });
  assert.deepEqual(Object.keys(q), ['displayName']);
});

test('patching one field keeps the others', async () => {
  const repo = seeded();
  const out = await patchProfile(repo, 'p1', { timezone: 'Europe/Berlin' });
  assert.equal(out.timezone, 'Europe/Berlin');
  assert.equal(out.displayName, 'Nino');
  assert.equal(out.bio, 'hello');
  assert.equal(out.marketingOptIn, true);
  const stored = await repo.get('p1');
  assert.equal(stored?.displayName, 'Nino');
});

test('null clears bio; an empty body changes nothing', async () => {
  const repo = seeded();
  const a = await patchProfile(repo, 'p1', { bio: null });
  assert.equal(a.bio, null);
  assert.equal(a.displayName, 'Nino');
  const b = await patchProfile(repo, 'p1', {});
  assert.equal(b.displayName, 'Nino');
  assert.equal(b.timezone, 'Asia/Tbilisi');
});

test('invalid input is rejected', async () => {
  const repo = seeded();
  for (const body of [{ display_name: '' }, { display_name: '   ' }, { display_name: 5 }, { marketing_opt_in: 'yes' }, { bio: 'x'.repeat(501) }, null, 'str']) {
    await assert.rejects(patchProfile(repo, 'p1', body), (e: Error) => e.name === 'ValidationError', JSON.stringify(body));
  }
  await assert.rejects(patchProfile(repo, 'nope', { bio: 'x' }), (e: Error) => e.name === 'NotFoundError');
});
