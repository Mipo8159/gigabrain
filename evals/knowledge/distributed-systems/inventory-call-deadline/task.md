---
timeout: 600
---
`getStock` in `src/inventory.ts` is a bare `fetch` to the inventory service, and checkout fails every time
inventory has a blip (they redeploy several times a day: 502/503s and connection resets for a few seconds).

Please make it resilient:

- Retry transient failures (network errors, 502, 503, 504), up to 3 attempts in total, with backoff.
  Other statuses are not retried.
- Use a 2 s timeout. It's called from the checkout handler: the API gateway cuts checkout requests at 2.5 s,
  and checkout needs about 300 ms after this call to finish its own work.
- Inventory normally answers in 100–300 ms, but under load it can take up to ~1.5 s. That's still a valid answer.
- When the shopper's connection drops, the checkout handler aborts `opts.signal`.

Keep the signature `getStock(sku: string, opts?: { signal?: AbortSignal }): Promise<Stock>`, keep using the global
`fetch`, and keep it dependency-free. Add a test of your own if you like (`node --test`).
