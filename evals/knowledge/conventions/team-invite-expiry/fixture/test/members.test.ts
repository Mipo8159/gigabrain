import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTeam, addMember, listMembers } from '../src/teams/members.ts';

test('owner is a member; adding twice is idempotent', () => {
  const t = createTeam('Ops', 'u1');
  addMember(t.id, 'u2');
  addMember(t.id, 'u2');
  assert.deepEqual(listMembers(t.id).map((m) => [m.userId, m.role]).sort(), [['u1', 'owner'], ['u2', 'member']]);
});
