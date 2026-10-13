import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeUserHandlers } from '../src/users/handlers.ts';
import { pgUsersRepo, type Db } from '../src/users/repo.ts';

// What Postgres really returns for SELECT *: every column on the table,
// including ones added by other teams' migrations that UserRow doesn't list.
const table = [
  { id: 'u1', teamId: 't1', email: 'nino@example.com', displayName: 'Nino', avatarUrl: null, role: 'admin', passwordHash: '$argon2id$v=19$aaa', createdAt: new Date('2026-01-01T00:00:00Z'), mfaSecret: 'JBSWY3DPEHPK3PXP', stripeCustomerId: 'cus_123', resetToken: 'rt_secret' },
  { id: 'u2', teamId: 't1', email: 'ana@example.com', displayName: 'Ana', avatarUrl: 'https://cdn/x.png', role: 'member', passwordHash: '$argon2id$v=19$bbb', createdAt: new Date('2026-02-01T00:00:00Z'), mfaSecret: null, stripeCustomerId: 'cus_456', resetToken: null },
  { id: 'u3', teamId: 't2', email: 'zura@example.com', displayName: 'Zura', avatarUrl: null, role: 'owner', passwordHash: '$argon2id$v=19$ccc', createdAt: new Date('2026-03-01T00:00:00Z'), mfaSecret: null, stripeCustomerId: null, resetToken: null },
];

const db: Db = {
  async query<T>(sql: string, params: unknown[]) {
    const v = params[0];
    const rows = /"teamId"\s*=/.test(sql) ? table.filter(r => r.teamId === v) : table.filter(r => r.id === v);
    return { rows: rows.map(r => ({ ...r })) as T[] };
  },
};

const PUBLIC_KEYS = ['avatarUrl', 'createdAt', 'displayName', 'id', 'teamId'];
const wire = (x: unknown) => JSON.parse(JSON.stringify(x));

test('getUser returns only public fields', async () => {
  const h = makeUserHandlers(pgUsersRepo(db));
  const r = await h.getUser('u1');
  assert.equal(r.status, 200);
  const body = wire(r.body);
  assert.deepEqual(Object.keys(body).sort(), PUBLIC_KEYS);
  assert.equal(body.displayName, 'Nino');
  assert.equal(body.createdAt, '2026-01-01T00:00:00.000Z');
});

test('listTeam returns only public fields, sorted by displayName', async () => {
  const h = makeUserHandlers(pgUsersRepo(db));
  const r = await h.listTeam('t1');
  assert.equal(r.status, 200);
  const body = wire(r.body) as Record<string, unknown>[];
  assert.deepEqual(body.map(u => u.displayName), ['Ana', 'Nino']);
  for (const u of body) assert.deepEqual(Object.keys(u).sort(), PUBLIC_KEYS);
  assert.deepEqual(wire((await h.listTeam('nope')).body), []);
});

test('unknown user is a 404', async () => {
  const h = makeUserHandlers(pgUsersRepo(db));
  const r = await h.getUser('missing');
  assert.equal(r.status, 404);
  assert.doesNotMatch(JSON.stringify(r.body), /argon2|JBSW|cus_/);
});
