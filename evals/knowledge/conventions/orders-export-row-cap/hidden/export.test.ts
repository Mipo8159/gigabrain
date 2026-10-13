import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { initConfig } from '../src/config.ts';
import { orderStore } from '../src/orders/store.ts';
import { exportOrdersCsv } from '../src/orders/export.ts';

// The settings a deployment hands the app (the same path main.ts uses), not the shell's environment.
const env = { NODE_ENV: 'test', SESSION_SECRET: 's'.repeat(40), SMTP_HOST: 'smtp.test' };
delete process.env.EXPORT_MAX_ROWS;

beforeEach(() => {
  orderStore.clear();
  for (let i = 1; i <= 5; i++) {
    orderStore.add({ id: `o${i}`, customerId: 'c1', createdAt: `2026-0${i}-01T10:00:00.000Z`, status: 'paid', totalCents: i * 1050 });
  }
  orderStore.add({ id: 'x1', customerId: 'c2', createdAt: '2026-03-03T10:00:00.000Z', status: 'paid', totalCents: 1 });
});

const lines = (csv: string) => csv.trim().split(/\r?\n/);

test('default: all orders, newest first, totals in major units', () => {
  initConfig(env);
  const { csv, truncated } = exportOrdersCsv('c1');
  const l = lines(csv);
  assert.equal(l[0], 'id,created_at,status,total');
  assert.deepEqual(l.slice(1).map((x) => x.split(',')[0]), ['o5', 'o4', 'o3', 'o2', 'o1']);
  assert.equal(l[1].split(',')[3], '52.50');
  assert.equal(truncated, false);
});

test('EXPORT_MAX_ROWS from the deployment settings caps the export', () => {
  initConfig({ ...env, EXPORT_MAX_ROWS: '2' });
  const { csv, truncated } = exportOrdersCsv('c1');
  assert.deepEqual(lines(csv).slice(1).map((x) => x.split(',')[0]), ['o5', 'o4']);
  assert.equal(truncated, true);
});

test('cap equal to the number of orders is not truncated', () => {
  initConfig({ ...env, EXPORT_MAX_ROWS: '5' });
  const { csv, truncated } = exportOrdersCsv('c1');
  assert.equal(lines(csv).length, 6);
  assert.equal(truncated, false);
});
