---
timeout: 600
---
Implement `getText(url, opts)` in `src/partner-client.ts`. It's what our gateway uses to call partner APIs, and the
caller turns the outcome into a user-facing message and a metric, so the outcome categories must be right.

```ts
export type Outcome =
  | { status: 'ok'; body: string }
  | { status: 'timeout' }        // no complete response within opts.timeoutMs
  | { status: 'cancelled' }      // the caller's opts.signal was aborted (user navigated away, request cancelled)
  | { status: 'error'; message: string }; // anything else: network failure, non-2xx response, ...

export async function getText(url: string, opts: { timeoutMs: number; signal?: AbortSignal }): Promise<Outcome>
```

- GET the URL with the built-in `fetch` (Node 24, no dependencies). 2xx returns the body text.
- It never throws; every failure maps to one of the outcomes above.
- It must stop waiting and free the request promptly on timeout or cancellation.
