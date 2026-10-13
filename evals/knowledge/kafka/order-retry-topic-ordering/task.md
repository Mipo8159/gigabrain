---
timeout: 600
deps: kafka
heldout: true
---
The fulfilment consumer stalls a whole partition whenever the warehouse API is flaky for one order: `apply` throws, the consumer retries that offset, and every other order on the partition waits behind it.

We're switching to a retry topic. Please rework `createOrderProcessor(deps)` in `src/processor.ts` (keep the exported names and types):

```ts
createOrderProcessor(deps: { apply(e: OrderEvent): Promise<void>; retry: RetryTopic }): { handle(e: OrderEvent): Promise<void>; handleRetry(e: OrderEvent): Promise<void> }
```

- `handle` is called for each event from `orders.lifecycle`; `handleRetry` for each event read back from `orders.lifecycle.retry` (a separate consumer delays them ~30 s). Both should resolve once the event is either applied or handed to `deps.retry.send`, so the main consumer can move on.
- If `apply` fails, the event goes to the retry topic; if it fails again on retry, it goes back to the retry topic.
- The warehouse needs each order's events in order (it rejects `OrderPaid` before `OrderCreated`, etc.). A failing order must not hold up other orders.
- One processor instance per partition; calls into it are sequential (never concurrent). Keeping state in memory is fine for now.

Add tests under `test/` if you like (`node --test`).
