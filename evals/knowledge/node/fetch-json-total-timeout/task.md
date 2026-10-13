---
timeout: 600
heldout: true
---
Checkout calls the pricing service through `fetchJson` in `src/http.ts`. Last week pricing degraded and checkout
requests hung for minutes instead of failing fast and falling back to cached prices.

Add a timeout: `fetchJson(url, { timeoutMs })` must settle within about `timeoutMs`. It resolves with the parsed JSON
on success and rejects on timeout, on non-2xx responses and on network errors (the caller catches and falls back, so
the exact error type doesn't matter). Keep the signature below; built-in `fetch` only, no dependencies.

```ts
export async function fetchJson<T = unknown>(url: string, opts: { timeoutMs: number }): Promise<T>
```
