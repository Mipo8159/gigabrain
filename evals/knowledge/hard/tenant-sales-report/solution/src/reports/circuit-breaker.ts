export class CircuitOpenError extends Error {
  constructor() {
    super('circuit open');
    this.name = 'CircuitOpenError';
  }
}

/**
 * Consecutive-failure breaker. Only errors that `isFailure` accepts count: an answer like 404 means the
 * dependency is healthy and resets the count. After `openMs`, one probe goes through; success closes it.
 */
export class CircuitBreaker {
  private failures = 0;
  private openUntil = 0;
  private probing = false;

  constructor(
    private readonly threshold: number,
    private readonly openMs: number,
    private readonly isFailure: (e: unknown) => boolean,
    private readonly now: () => number = Date.now,
  ) {}

  get isOpen() {
    return this.openUntil > this.now() || this.probing;
  }

  async exec<T>(fn: () => Promise<T>): Promise<T> {
    let probe = false;
    if (this.openUntil) {
      if (this.openUntil > this.now() || this.probing) throw new CircuitOpenError();
      this.probing = probe = true;
    }
    try {
      const v = await fn();
      this.close();
      return v;
    } catch (e) {
      if (!this.isFailure(e)) {
        this.close();
      } else if (probe || ++this.failures >= this.threshold) {
        this.openUntil = this.now() + this.openMs;
        this.failures = 0;
      }
      throw e;
    } finally {
      if (probe) this.probing = false;
    }
  }

  private close() {
    this.failures = 0;
    this.openUntil = 0;
  }
}
