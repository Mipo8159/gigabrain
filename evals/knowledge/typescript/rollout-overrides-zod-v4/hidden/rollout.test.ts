import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRolloutConfig } from '../src/rollout.ts';
import { percentFor } from '../src/percent.ts';
import type { ParseResult, FieldError } from '../src/types.ts';

function ok(r: ParseResult) {
  if (!r.ok) assert.fail('expected ok, got errors: ' + JSON.stringify(r.errors));
  return r.config;
}
function errs(r: ParseResult): FieldError[] {
  if (r.ok) assert.fail('expected errors, got ok: ' + JSON.stringify(r.config));
  return r.errors;
}

test('a partial override map is valid', () => {
  const cfg = ok(parseRolloutConfig({ flag: 'new-checkout', defaultPercent: 10, regionOverrides: { eu: 50 } }));
  assert.deepEqual(cfg.regionOverrides, { eu: 50 });
  assert.equal(cfg.killSwitch, false);
  assert.equal(percentFor(cfg, 'eu'), 50);
  assert.equal(percentFor(cfg, 'us'), 10);
  const two = ok(parseRolloutConfig({ flag: 'x', defaultPercent: 0, regionOverrides: { us: 100, apac: 5 }, killSwitch: true }));
  assert.deepEqual(two.regionOverrides, { us: 100, apac: 5 });
  assert.equal(two.killSwitch, true);
});

test('omitted overrides default to {}', () => {
  const cfg = ok(parseRolloutConfig({ flag: 'x', defaultPercent: 25 }));
  assert.deepEqual(cfg.regionOverrides, {});
  assert.equal(percentFor(cfg, 'latam'), 25);
});

test('unknown region is an error under regionOverrides', () => {
  const e = errs(parseRolloutConfig({ flag: 'x', defaultPercent: 25, regionOverrides: { mars: 5 } }));
  assert.ok(e.some(x => x.path.startsWith('regionOverrides')), JSON.stringify(e));
});

test('all problems are reported with dotted paths', () => {
  const e = errs(parseRolloutConfig({ flag: 'Bad Flag!', defaultPercent: 150, regionOverrides: { eu: -1, us: 20.5 }, killSwitch: 'yes' }));
  const paths = e.map(x => x.path);
  for (const p of ['flag', 'defaultPercent', 'regionOverrides.eu', 'regionOverrides.us', 'killSwitch']) {
    assert.ok(paths.includes(p), `missing error for ${p}; got ${JSON.stringify(paths)}`);
  }
  for (const x of e) assert.equal(typeof x.message, 'string');
});

test('non-object input is an error, not a crash', () => {
  for (const v of [null, 'x', 42, []]) {
    const r = parseRolloutConfig(v);
    assert.equal(r.ok, false);
  }
});
