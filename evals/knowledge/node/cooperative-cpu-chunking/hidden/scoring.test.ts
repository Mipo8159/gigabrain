import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreAll } from '../src/scoring.ts';
import { scoreRecord, type Rec } from '../src/model.ts';

const COUNTRIES = ['GE', 'DE', 'US', 'FR', 'BR'];
const make = (n: number): Rec[] => Array.from({ length: n }, (_, i) => ({ id: i + 1, amount: (i * 37) % 5000, country: COUNTRIES[i % 5] }));

// size the batch so the plain synchronous loop takes ~800 ms on this machine
function sizedBatch(): { recs: Rec[]; syncMs: number } {
  let n = 2000;
  for (;;) {
    const recs = make(n);
    const t = performance.now();
    for (const r of recs) scoreRecord(r);
    const ms = performance.now() - t;
    if (ms >= 200) {
      const m = Math.ceil(n * (800 / ms));
      return { recs: make(m), syncMs: ms * (m / n) };
    }
    n *= 2;
  }
}

test('scores every record, same order as the synchronous model', async () => {
  const recs = make(500);
  assert.deepEqual(await scoreAll(recs), recs.map(scoreRecord));
});

test('does not stall timers while a big batch is scored', async () => {
  const { recs, syncMs } = sizedBatch();
  let last = performance.now();
  let maxGap = 0;
  let ticks = 0;
  const iv = setInterval(() => {
    const now = performance.now();
    maxGap = Math.max(maxGap, now - last);
    last = now;
    ticks++;
  }, 1);
  const t0 = performance.now();
  last = t0;
  let result: number[];
  try {
    result = await scoreAll(recs);
  } finally {
    clearInterval(iv);
  }
  const end = performance.now();
  maxGap = Math.max(maxGap, end - last);
  assert.equal(result.length, recs.length);
  // spec says ~50 ms; allow 3x for GC and CI noise. The blocking version stalls for the whole batch (~800 ms).
  assert.ok(maxGap < 150, `timers stalled for ${maxGap.toFixed(0)} ms (batch ~${syncMs.toFixed(0)} ms sync, ${ticks} ticks)`);
});
