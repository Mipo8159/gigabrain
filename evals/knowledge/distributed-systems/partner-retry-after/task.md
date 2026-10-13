---
timeout: 600
heldout: true
---
`deliverWebhook(url, event)` in `src/deliver.ts` pushes one event to a partner's webhook endpoint. Right now it's a
single POST, and we lose events whenever a partner is rate-limiting us or briefly down.

Please add retries:

- Retry network errors and 502/504 with backoff.
- Partners rate-limit us: on 429 and 503 they send a `Retry-After` header. Two of the big partners have told us they
  block clients that come back earlier than `Retry-After` says, so honour it.
- It runs inside a job worker that holds a 30 s lease per job, so `deliverWebhook` must resolve or throw within 30 s
  of being called. If it throws, the job is re-queued and picked up again later, which is fine.
- Any other non-2xx status is permanent: throw without retrying.

Keep the signature `deliverWebhook(url: string, event: unknown): Promise<void>`, keep using the global `fetch`,
and don't add dependencies. Add a test of your own if you like (`node --test`).
