export type BreakerOptions = {
  failureThreshold?: number; // default 5
  resetTimeoutMs?: number; // default 10_000
  timeoutMs?: number; // default 2_000
};

export class BreakerOpenError extends Error {}

export class CircuitBreaker {
  constructor(opts: BreakerOptions = {}) {}

  async call<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
    throw new Error('not implemented');
  }
}
