---
timeout: 600
deps: kafka
---
Please implement `startOrderConsumer(consumer, topic, save)` in `src/consumer.ts` (kafkajs 2.2.4, already installed).

- `consumer` is a connected kafkajs `Consumer` (see `src/main.ts`). Subscribe it to `topic` (read from the beginning when the group is new) and start it.
- Each message value is a JSON `Order` (`src/orders.ts`). Call `save(order)` for it.
- We lost orders last quarter because offsets were auto-committed before the DB write finished. So: run with auto-commit off and commit the offset yourself with `consumer.commitOffsets`, only once `save` has resolved for that message. If `save` throws, don't commit it; let the error propagate so kafkajs retries the message.
- Resolve once the consumer is running.

Add a unit test if you like (`node --test`); there is no broker in CI for this repo.
