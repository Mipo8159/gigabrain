---
timeout: 600
---
The pricing service goes down or gets very slow a few times a week, and when it does every product page waits on
it and our instances pile up requests until they fall over. Please implement the circuit breaker in
`src/breaker.ts` (the stub has the API we agreed on) and use it for the pricing call in `src/quote.ts`.

What we agreed in the design review:
- Open after 5 failures in a row (`failureThreshold`). While open, calls fail immediately without touching pricing.
- After `resetTimeoutMs` (10 s), let traffic try pricing again; close once pricing answers successfully.
- Each call gets `timeoutMs` (2 s). `fn` receives an `AbortSignal` it passes on to `fetch`.
- Errors from `fn` are rethrown to the caller unchanged.

Context: every product page calls pricing, about 200 requests/s per instance. Pricing answers 404 for unknown SKUs and
422 for malformed ones; SKUs come straight from search and URLs, so we get plenty of those.

Keep the class and method signatures in the stub. No new dependencies. Add a test of your own if you like
(`node --test`).
