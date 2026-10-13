import { setTimeout as sleep } from 'node:timers/promises';

const LEASE_MS = 30_000;
const SAFETY_MS = 1_000; // leave room to report the result before the lease ends
const RETRYABLE = new Set([429, 502, 503, 504]);

class DeliveryError extends Error {
  status?: number;
  constructor(msg: string, status?: number) { super(msg); this.status = status; }
}

// RFC 9110 §10.2.3: delay-seconds or an HTTP-date. Returns ms to wait, or undefined if absent/garbage.
export function parseRetryAfter(value: string | null, now = Date.now()): number | undefined {
  if (!value) return undefined;
  const v = value.trim();
  if (/^\d+$/.test(v)) return Number(v) * 1000;
  const at = Date.parse(v);
  return Number.isNaN(at) ? undefined : Math.max(0, at - now);
}

export async function deliverWebhook(url: string, event: unknown): Promise<void> {
  const deadline = performance.now() + LEASE_MS - SAFETY_MS;
  const signal = AbortSignal.timeout(LEASE_MS - SAFETY_MS);
  for (let attempt = 1; ; attempt++) {
    let wait: number;
    let err: Error;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(event),
        signal,
      });
      if (res.ok) return;
      await res.body?.cancel();
      err = new DeliveryError(`webhook ${url} responded ${res.status}`, res.status);
      if (!RETRYABLE.has(res.status)) throw err;
      const backoff = Math.random() * Math.min(10_000, 500 * 2 ** attempt);
      const ra = res.status === 429 || res.status === 503 ? parseRetryAfter(res.headers.get('retry-after')) : undefined;
      wait = ra ?? backoff;
    } catch (e) {
      if (e instanceof DeliveryError && !RETRYABLE.has(e.status!)) throw e;
      if (signal.aborted) throw new DeliveryError(`webhook ${url}: gave up, lease budget spent`);
      err = e as Error;
      wait = Math.random() * Math.min(10_000, 500 * 2 ** attempt);
    }
    // Waiting past the lease is pointless; retrying before Retry-After gets us blocked. Fail now, re-queue.
    if (performance.now() + wait >= deadline) throw err;
    await sleep(wait);
  }
}
