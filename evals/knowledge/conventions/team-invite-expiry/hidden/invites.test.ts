import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { FakeClock, useClock, DAY, MINUTE } from '../src/lib/clock.ts';
import { createInvite, acceptInvite, listPendingInvites } from '../src/teams/invites.ts';
import { createTeam, listMembers } from '../src/teams/members.ts';
import { InviteExpiredError, NotFoundError } from '../src/errors.ts';

let restore = () => {};
afterEach(() => restore());

test('expiresAt is 7 days after the invite was sent', () => {
  const c = new FakeClock('2031-05-10T12:00:00Z');
  restore = useClock(c);
  const t = createTeam('A', 'owner');
  const inv = createInvite(t.id, 'x@example.com', 'owner');
  assert.equal(new Date(inv.expiresAt).getTime(), new Date('2031-05-17T12:00:00Z').getTime());
});

test('accepting within 7 days adds the member; the token is single use', () => {
  const c = new FakeClock('2031-05-10T12:00:00Z');
  restore = useClock(c);
  const t = createTeam('B', 'owner');
  const inv = createInvite(t.id, 'y@example.com', 'owner');
  c.advance(7 * DAY - 5 * MINUTE);
  acceptInvite(inv.token, 'u-y');
  assert.ok(listMembers(t.id).some((m) => m.userId === 'u-y'));
  assert.throws(() => acceptInvite(inv.token, 'u-z'), NotFoundError);
  assert.throws(() => acceptInvite('nope', 'u-z'), NotFoundError);
});

test('an invite older than 7 days cannot be accepted', () => {
  const c = new FakeClock('2031-05-10T12:00:00Z');
  restore = useClock(c);
  const t = createTeam('C', 'owner');
  const inv = createInvite(t.id, 'z@example.com', 'owner');
  c.advance(7 * DAY + 1000);
  assert.throws(() => acceptInvite(inv.token, 'u-z'), InviteExpiredError);
  assert.ok(!listMembers(t.id).some((m) => m.userId === 'u-z'));
});

test('expired invites drop out of the pending list', () => {
  const c = new FakeClock('2031-05-10T12:00:00Z');
  restore = useClock(c);
  const t = createTeam('D', 'owner');
  createInvite(t.id, 'old@example.com', 'owner');
  c.advance(3 * DAY);
  createInvite(t.id, 'new@example.com', 'owner');
  assert.equal(listPendingInvites(t.id).length, 2);
  c.advance(5 * DAY);
  assert.deepEqual(listPendingInvites(t.id).map((i) => i.email), ['new@example.com']);
});
