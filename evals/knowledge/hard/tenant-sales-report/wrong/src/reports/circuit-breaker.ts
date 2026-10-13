export class CircuitOpenError extends Error {
  constructor() {
    super('circuit open');
    this.name = 'CircuitOpenError';
  }
}

/** Consecutive-failure breaker. After `openMs`, one probe goes through; success closes it. */
export class CircuitBreaker {
  private failures = 0;
  private openUntil = 0;
  private probing = false;

  constructor(
    private readonly threshold: number,
    private readonly openMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  async exec<T>(fn: () => Promise<T>): Promise<T> {
    let probe = false;
    if (this.openUntil) {
      if (this.openUntil > this.now() || this.probing) throw new CircuitOpenError();
      this.probing = probe = true;
    }
    try {
      const v = await fn();
      this.failures = 0;
      this.openUntil = 0;
      return v;
    } catch (e) {
      if (probe || ++this.failures >= this.threshold) {
        this.openUntil = this.now() + this.openMs;
        this.failures = 0;
      }
      throw e;
    } finally {
      if (probe) this.probing = false;
    }
  }
}
