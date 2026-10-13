export interface Sink {
  writeMany(records: unknown[]): Promise<void>;
}

type Pending = { record: unknown; onDone: (err?: Error) => void };

export class BatchWriter {
  private readonly sink: Sink;
  private readonly maxBatch: number;
  private readonly flushMs: number;
  private pending: Pending[] = [];
  private timer: NodeJS.Timeout | undefined;
  private inflight = new Set<Promise<void>>();

  constructor(sink: Sink, opts: { maxBatch?: number; flushMs?: number } = {}) {
    this.sink = sink;
    this.maxBatch = opts.maxBatch ?? 100;
    this.flushMs = opts.flushMs ?? 10;
  }

  add(record: unknown, onDone: (err?: Error) => void): void {
    this.pending.push({ record, onDone });
    if (this.pending.length >= this.maxBatch) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.flushMs);
    }
  }

  private flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    if (this.pending.length === 0) return;
    const batch = this.pending;
    this.pending = [];
    const write = this.sink
      .writeMany(batch.map((p) => p.record))
      .then(
        () => batch.forEach((p) => p.onDone()),
        (err: Error) => batch.forEach((p) => p.onDone(err)),
      )
      .finally(() => this.inflight.delete(write));
    this.inflight.add(write);
  }

  async close(): Promise<void> {
    this.flush();
    await Promise.all(this.inflight);
  }
}
