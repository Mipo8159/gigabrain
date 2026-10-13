// Virtual clock for hidden tests: one timeline for setTimeout/setInterval (incl. node:timers/promises),
// Date, performance.now, process.hrtime.bigint and AbortSignal.timeout. No real waiting.
import type { TestContext } from 'node:test';
import { syncBuiltinESMExports } from 'node:module';

export const START = Date.UTC(2026, 0, 5, 12, 0, 0); // whole second, so HTTP-dates are exact

export function fakeClock(t: TestContext) {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date', 'AbortSignal.timeout'], now: START });
  t.mock.method(performance, 'now', () => 5_000 + (Date.now() - START));
  t.mock.method(process.hrtime, 'bigint', () => BigInt(5_000 + (Date.now() - START)) * 1_000_000n);
  syncBuiltinESMExports(); // so `import { setTimeout } from 'node:timers/promises'` sees the mock too
  t.after(() => { t.mock.timers.reset(); syncBuiltinESMExports(); });
  const flush = async () => { for (let i = 0; i < 3; i++) await new Promise((r) => setImmediate(r)); };
  const clock = {
    /** virtual ms since the test started */
    now: () => Date.now() - START,
    async advance(ms: number, step = 5) {
      for (let done = 0; done < ms; done += step) { t.mock.timers.tick(Math.min(step, ms - done)); await flush(); }
    },
    /** Track a promise: records the virtual time it settled at. */
    track<T>(p: Promise<T>) {
      const s: { settled: boolean; at: number; value?: T; error?: unknown } = { settled: false, at: -1 };
      p.then((v) => { s.settled = true; s.at = clock.now(); s.value = v; },
             (e) => { s.settled = true; s.at = clock.now(); s.error = e; });
      return s;
    },
    /** Advance until `s` settles or `maxMs` of virtual time has passed. */
    async runUntil(s: { settled: boolean }, maxMs: number, step = 5) {
      await flush();
      const end = clock.now() + maxMs;
      while (!s.settled && clock.now() < end) { t.mock.timers.tick(step); await flush(); }
    },
    flush,
  };
  return clock;
}
