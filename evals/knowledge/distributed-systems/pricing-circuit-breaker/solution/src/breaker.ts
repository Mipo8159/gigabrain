import { HttpError } from './http.ts';

export type BreakerOptions = {
  failureThreshold?: number; // default 5
  resetTimeoutMs?: number; // default 10_000
  timeoutMs?: number; // default 2_000
};

export class BreakerOpenError extends Error {}

type State = 'closed' | 'open' | 'half-open';

// Only failures of the dependency count. A 4xx is the dependency working correctly on a bad request.
function countsAsFailure(err: unknown): boolean {
  if (err instanceof HttpError) return err.status >= 500 || err.status === 408 || err.status === 429;
  return true; // timeouts, connection errors
}

export class CircuitBreaker {
  #threshold: number;
  #resetMs: number;
  #timeoutMs: number;
  #state: State = 'closed';
  #failures = 0;
  #openedAt = 0;
  #probeInFlight = false;

  constructor(opts: BreakerOptions = {}) {
    this.#threshold = opts.failureThreshold ?? 5;
    this.#resetMs = opts.resetTimeoutMs ?? 10_000;
    this.#timeoutMs = opts.timeoutMs ?? 2_000;
  }

  async call<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
    let probe = false;
    if (this.#state === 'open') {
      if (performance.now() - this.#openedAt < this.#resetMs) throw new BreakerOpenError('circuit open');
      this.#state = 'half-open';
    }
    if (this.#state === 'half-open') {
      if (this.#probeInFlight) throw new BreakerOpenError('circuit half-open: trial call in flight');
      this.#probeInFlight = probe = true;
    }

    const ac = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        const err = new Error(`timed out after ${this.#timeoutMs} ms`);
        ac.abort(err); // cancel the underlying request, don't just stop waiting for it
        reject(err);
      }, this.#timeoutMs);
    });
    try {
      const result = await Promise.race([fn(ac.signal), timeout]);
      this.#onSuccess();
      return result;
    } catch (err) {
      this.#onError(err, probe);
      throw err;
    } finally {
      clearTimeout(timer);
      if (probe) this.#probeInFlight = false;
    }
  }

  #onSuccess() {
    this.#failures = 0;
    this.#state = 'closed';
  }

  #onError(err: unknown, probe: boolean) {
    if (!countsAsFailure(err)) {
      if (probe) this.#onSuccess(); // pricing answered: it is up
      else this.#failures = 0;
      return;
    }
    this.#failures++;
    if (probe || this.#failures >= this.#threshold) {
      this.#state = 'open';
      this.#openedAt = performance.now();
    }
  }
}
