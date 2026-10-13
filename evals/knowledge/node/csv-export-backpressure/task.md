---
timeout: 600
---
In this repo, implement `writeCsv(rows, out)` in `src/csv.ts`.

- `rows` is an `AsyncIterable<Record<string, unknown>>` (it can be millions of rows coming from a DB cursor).
- `out` is a Node `Writable` (an HTTP response in production).
- Write a header line from the first row's keys, then one line per row. Quote fields per RFC 4180 when needed.
- Return a Promise that resolves when everything has been written and `out` has finished.

Keep it dependency-free. Add a quick test of your own if you like (`node --test`).
