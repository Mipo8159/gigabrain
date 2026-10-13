import { runBillingCycle, type BillingDeps } from './run-cycle.ts';
import { log } from '../logger.ts';

/**
 * Starts a billing cycle every `everyMs` (cycles never overlap within one replica).
 * stop() aborts the running cycle's signal and resolves once it has returned.
 */
export function startScheduler(deps: BillingDeps, everyMs: number): { stop(): Promise<void> } {
  const ac = new AbortController();
  const loop = (async () => {
    while (!ac.signal.aborted) {
      const t0 = Date.now();
      try {
        const r = await runBillingCycle(deps, ac.signal);
        if (r.billed || r.declined || r.deferred) log.info('billing cycle', { ...r, ms: Date.now() - t0 });
      } catch (e) {
        log.error('billing cycle failed', { err: String(e) });
      }
      const wait = Math.max(0, everyMs - (Date.now() - t0));
      await new Promise<void>((r) => {
        const t = setTimeout(r, wait);
        ac.signal.addEventListener('abort', () => { clearTimeout(t); r(); }, { once: true });
      });
    }
  })();
  return { stop: async () => { ac.abort(); await loop; } };
}
