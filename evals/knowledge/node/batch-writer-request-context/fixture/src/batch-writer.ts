export interface Sink {
  writeMany(records: unknown[]): Promise<void>;
}

export class BatchWriter {
  constructor(sink: Sink, opts: { maxBatch?: number; flushMs?: number } = {}) {
    throw new Error('not implemented');
  }

  add(record: unknown, onDone: (err?: Error) => void): void {
    throw new Error('not implemented');
  }

  async close(): Promise<void> {
    throw new Error('not implemented');
  }
}
