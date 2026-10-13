import { AsyncResource } from 'node:async_hooks';

export interface Sink {
  writeMany(records: unknown[]): Promise<void>;
}

type Entry = { record: unknown; onDone: (err?: Error) => void };

export class BatchWriter {
  private sink: Sink;
  private maxBatch: number;
  private flushMs: number;
  private buf: Entry[] = [];
  private timer: NodeJS.Timeout | undefined;
  private inflight = new Set<Promise<void>>();

  constructor(sink: Sink, opts: { maxBatch?: number; flushMs?: number } = {}) {
    this.sink = sink;
    this.maxBatch = opts.maxBatch ?? 100;
    this.flushMs = opts.flushMs ?? 10;
  }

  add(record: unknown, onDone: (err?: Error) => void): void {
    // run the callback later in the async context of the caller that added it
    this.buf.push({ record, onDone: AsyncResource.bind(onDone) });
    if (this.buf.length >= this.maxBatch) this.flush();
    else if (!this.timer) this.timer = setTimeout(() => this.flush(), this.flushMs);
  }

  private flush(): void {
    if (this.timer) { clearTimeout(this.timer); this.timer = undefined; }
    if (!this.buf.length) return;
    const batch = this.buf;
    this.buf = [];
    const p = this.sink.writeMany(batch.map((e) => e.record)).then(
      () => { for (const e of batch) e.onDone(); },
      (err: Error) => { for (const e of batch) e.onDone(err); },
    ).finally(() => this.inflight.delete(p));
    this.inflight.add(p);
  }

  async close(): Promise<void> {
    this.flush();
    await Promise.all([...this.inflight]);
  }
}
