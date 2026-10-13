# Node: what the runs taught

## Baseline 2026-10-12 (vanilla Opus 5.5, write mode, 2 runs per case, results/20261012-234812)

Base passed **18 of 18** runs. Vanilla Claude already gets all of these right on a
focused ticket, so none of them belong in a skill:

- stream backpressure: wait for `'drain'` (csv-export-backpressure, the smoke case)
- graceful shutdown closes idle and busy keep-alive sockets (graceful-shutdown-keepalive)
- cancel on client disconnect with `res.on('close')`, not `req.on('close')` (abort-work-on-client-disconnect)
- yield CPU work with `setImmediate`, not `await Promise.resolve()` (cooperative-cpu-chunking)
- `AbortSignal.timeout` rejects with `TimeoutError` (fetch-timeout-vs-cancel)
- one total deadline that also covers the body (fetch-json-total-timeout, heldout)
- UTF-8 characters split across chunks: `TextDecoder` with `stream: true` or `setEncoding` (ndjson-stream-reader, heldout)
- async EventEmitter listeners: `captureRejections` or wrapping (job-queue-async-subscribers)
- AsyncLocalStorage context lost in shared timers (batch-writer-request-context)

## What this means

Opus knows the Node runtime well when it writes fresh code and can run it.
Next experiment: review mode (`--mode review`). The same traps arrive as a
teammate's plausible PR. Does Claude catch them when the wrong code already exists?
