import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { captureLogs, type LogEntry } from '../src/lib/log.ts';
import { userStore } from '../src/users/store.ts';
import { registerUser } from '../src/users/register.ts';
import * as auth from '../src/auth/login.ts';

// Everything the process prints: the repo's log sink plus raw stdout/stderr/console.
let cap: { entries: LogEntry[]; stop: () => void };
let raw: string[] = [];
const restore: Array<() => void> = [];
beforeEach(() => {
  userStore.clear();
  raw = [];
  cap = captureLogs();
  for (const s of [process.stdout, process.stderr] as const) {
    const orig = s.write;
    (s as any).write = (chunk: any, ...rest: any[]) => { raw.push(String(chunk)); return (orig as any).call(s, chunk, ...rest); };
    restore.push(() => { (s as any).write = orig; });
  }
  for (const m of ['log', 'info', 'warn', 'error', 'debug'] as const) {
    const orig = console[m];
    console[m] = (...a: unknown[]) => { raw.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')); };
    restore.push(() => { console[m] = orig; });
  }
});
afterEach(() => { cap.stop(); while (restore.length) restore.pop()!(); });

const everything = () => JSON.stringify(cap.entries) + raw.join('\n');
const mkUser = () => registerUser({ email: 'dana.k@example.com', name: 'Dana Kowalski', phone: '+48 600 100 200', password: 'right-pass' });

test('five failures lock the account, even against the right password', () => {
  const u = mkUser();
  for (let i = 0; i < 5; i++) assert.equal(auth.login('dana.k@example.com', 'wrong').ok, false);
  assert.deepEqual(auth.login('dana.k@example.com', 'right-pass'), { ok: false, reason: 'locked' });
  auth.unlockAccount(u.id);
  assert.deepEqual(auth.login('dana.k@example.com', 'right-pass'), { ok: true, userId: u.id });
});

test('a success resets the count', () => {
  const u = mkUser();
  for (let i = 0; i < 4; i++) auth.login('dana.k@example.com', 'wrong');
  assert.equal(auth.login('dana.k@example.com', 'right-pass').ok, true);
  for (let i = 0; i < 4; i++) auth.login('dana.k@example.com', 'wrong');
  assert.deepEqual(auth.login('dana.k@example.com', 'right-pass'), { ok: true, userId: u.id });
});

test('locking emits a warn event auth.account_locked identifying the user', () => {
  const u = mkUser();
  for (let i = 0; i < 5; i++) auth.login('dana.k@example.com', 'wrong');
  const hit = cap.entries.filter((e) => e.level === 'warn' && JSON.stringify(e).includes('auth.account_locked'));
  assert.equal(hit.length, 1, `expected one warn auth.account_locked event in the app log, got ${JSON.stringify(cap.entries.map((e) => [e.level, e.msg]))}`);
  assert.ok(JSON.stringify(hit[0]).includes(u.id), 'the event should carry the user id');
});

test('no personal data reaches any output', () => {
  mkUser();
  for (let i = 0; i < 6; i++) auth.login('dana.k@example.com', 'wrong');
  const out = everything();
  for (const pii of ['dana.k@example.com', 'Dana Kowalski', '600 100 200']) {
    assert.ok(!out.includes(pii), `"${pii}" leaked into the logs`);
  }
});
