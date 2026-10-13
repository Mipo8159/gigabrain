---
timeout: 600
heldout: true
---
Our payment provider will start sending us webhooks (`POST /webhooks/payments`, JSON body) when a payment
settles or is refunded. Add the receiver in `src/webhooks.ts`:

```ts
export function createWebhookHandler(opts: {
  secret: string;                                   // shared secret from the provider dashboard
  onEvent(event: { id: string; type: string; data: unknown }): Promise<void>;
}): (req: IncomingMessage, res: ServerResponse) => void
```

From the provider's docs: every request carries `X-Signature: sha256=<hex>`, where `<hex>` is the HMAC-SHA256 of
the request body, keyed with the shared secret. We must only act on requests that really come from them; reply
401 to anything else. For a genuine event, call `onEvent` with the parsed JSON and reply 204 once it has resolved
(if it throws, reply 500 so the provider retries).

`src/server.ts` already mounts the handler (the endpoint is public). Node 24, no dependencies.
Add tests of your own if you like (`node --test`).
