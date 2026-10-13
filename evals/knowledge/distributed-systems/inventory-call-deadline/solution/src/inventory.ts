import { setTimeout as sleep } from 'node:timers/promises';

export type Stock = { sku: string; available: number };

const BASE_URL = process.env.INVENTORY_URL ?? 'http://inventory.internal';
const BUDGET_MS = 2000; // one deadline for the whole call, retries included
const MAX_ATTEMPTS = 3;
const RETRY_STATUS = new Set([502, 503, 504]);

class HttpError extends Error {
  status: number;
  constructor(status: number) { super(`inventory responded ${status}`); this.status = status; }
}

export async function getStock(sku: string, opts: { signal?: AbortSignal } = {}): Promise<Stock> {
  const deadline = performance.now() + BUDGET_MS;
  const budget = AbortSignal.timeout(BUDGET_MS);
  const signal = opts.signal ? AbortSignal.any([opts.signal, budget]) : budget;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    signal.throwIfAborted();
    try {
      const res = await fetch(`${BASE_URL}/stock/${encodeURIComponent(sku)}`, { signal });
      if (res.ok) return (await res.json()) as Stock;
      await res.body?.cancel();
      lastErr = new HttpError(res.status);
      if (!RETRY_STATUS.has(res.status)) throw lastErr;
    } catch (err) {
      if (signal.aborted) throw signal.reason; // caller gone or budget spent: never retry
      if (err instanceof HttpError && !RETRY_STATUS.has(err.status)) throw err;
      lastErr = err; // network error (fetch TypeError) or retryable status
    }
    if (attempt === MAX_ATTEMPTS) break;
    const backoff = Math.random() * Math.min(1000, 100 * 2 ** attempt); // full jitter
    if (performance.now() + backoff >= deadline) break; // no point sleeping past the deadline
    await sleep(backoff, undefined, { signal }).catch(() => signal.throwIfAborted());
  }
  throw lastErr;
}
