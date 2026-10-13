---
timeout: 600
---
We write one audit row per event, straight from the HTTP handlers, and the database is drowning in tiny inserts.
Implement `BatchWriter` in `src/batch-writer.ts` so handlers can batch them:

```ts
export interface Sink { writeMany(records: unknown[]): Promise<void> }
export class BatchWriter {
  constructor(sink: Sink, opts?: { maxBatch?: number; flushMs?: number }) // defaults: 100 records, 10 ms
  add(record: unknown, onDone: (err?: Error) => void): void
  close(): Promise<void> // flush whatever is buffered, resolve when written
}
```

- `add` buffers the record. A batch is written with one `sink.writeMany` call when it reaches `maxBatch` records, or
  `flushMs` after the first record of the batch was added, whichever comes first.
- After its batch is written, each record's `onDone` is called (with the error if `writeMany` failed).
- One `BatchWriter` is shared by all requests in the process.

Handlers use it like this, and our log lines must keep carrying the right request id (support traces requests by it):

```ts
auditWriter.add(event, (err) => {
  if (err) log.error('audit write failed', { err: err.message });
  else log.info('audit saved', { event: event.type });
});
```

`log` (src/logger.ts) tags each line with the request id from `requestContext` (src/context.ts), which our HTTP
middleware sets with `requestContext.run({ requestId }, handler)`. Don't change those two files.
