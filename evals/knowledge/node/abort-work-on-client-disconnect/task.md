---
timeout: 600
---
`POST /reports` is our most expensive endpoint. Clients often give up on it (the browser tab closes, the mobile app
times out and retries), and we keep computing reports nobody will read. Under load that piles up badly.

Change `src/server.ts` so that when the client goes away before we respond, the report work is cancelled:
`buildReport(params, signal)` in `src/report.ts` already accepts an `AbortSignal` and stops early when it is aborted.
Requests whose client stays connected must be unaffected and still get their 200 with the report JSON.

Keep `createServer()` exported from `src/server.ts` with the same signature. Don't change `src/report.ts`.
