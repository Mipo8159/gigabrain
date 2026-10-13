import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.ts';

const base = { DATABASE_URL: 'postgres://app@db/app' };

test('defaults', () => {
  const c = loadConfig({ ...base });
  assert.equal(c.port, 8080);
  assert.equal(c.databaseUrl, base.DATABASE_URL);
  assert.equal(c.logLevel, 'info');
  assert.equal(c.enableBetaCheckout, false);
  assert.equal(c.requestTimeoutMs, 5000);
  assert.equal(c.maxUploadMb, undefined);
});

test('flag values ops actually use', () => {
  assert.equal(loadConfig({ ...base, ENABLE_BETA_CHECKOUT: 'true' }).enableBetaCheckout, true);
  assert.equal(loadConfig({ ...base, ENABLE_BETA_CHECKOUT: '1' }).enableBetaCheckout, true);
  assert.equal(loadConfig({ ...base, ENABLE_BETA_CHECKOUT: 'false' }).enableBetaCheckout, false);
  assert.equal(loadConfig({ ...base, ENABLE_BETA_CHECKOUT: '0' }).enableBetaCheckout, false);
  assert.equal(loadConfig({ ...base, ENABLE_BETA_CHECKOUT: '' }).enableBetaCheckout, false);
});

test('empty strings from Helm mean "not set"', () => {
  const c = loadConfig({ ...base, PORT: '', LOG_LEVEL: '', REQUEST_TIMEOUT_MS: '', MAX_UPLOAD_MB: '' });
  assert.equal(c.port, 8080);
  assert.equal(c.logLevel, 'info');
  assert.equal(c.requestTimeoutMs, 5000);
  assert.equal(c.maxUploadMb, undefined);
});

test('explicit values', () => {
  const c = loadConfig({ ...base, PORT: '3000', LOG_LEVEL: 'debug', REQUEST_TIMEOUT_MS: '250', MAX_UPLOAD_MB: '20' });
  assert.equal(c.port, 3000);
  assert.equal(c.logLevel, 'debug');
  assert.equal(c.requestTimeoutMs, 250);
  assert.equal(c.maxUploadMb, 20);
});

test('invalid values throw', () => {
  const bad: Record<string, string | undefined>[] = [
    {},
    { DATABASE_URL: '' },
    { ...base, PORT: 'abc' },
    { ...base, PORT: '70000' },
    { ...base, PORT: '0' },
    { ...base, LOG_LEVEL: 'verbose' },
    { ...base, ENABLE_BETA_CHECKOUT: 'maybe' },
    { ...base, REQUEST_TIMEOUT_MS: '-5' },
    { ...base, MAX_UPLOAD_MB: '0' },
  ];
  for (const env of bad) assert.throws(() => loadConfig(env), JSON.stringify(env));
});
