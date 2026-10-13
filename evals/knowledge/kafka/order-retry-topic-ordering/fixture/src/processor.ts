import type { OrderEvent, RetryTopic } from './events.ts';

export type OrderProcessor = {
  /** Called for each event from the main topic. */
  handle(event: OrderEvent): Promise<void>;
  /** Called for each event read back from the retry topic. */
  handleRetry(event: OrderEvent): Promise<void>;
};

export function createOrderProcessor(deps: {
  apply: (event: OrderEvent) => Promise<void>;
  retry: RetryTopic;
}): OrderProcessor {
  // Current behaviour: blocking. A failing apply throws, the consumer retries the same
  // offset, and the whole partition (every other order on it) waits.
  return {
    handle: (event) => deps.apply(event),
    handleRetry: (event) => deps.apply(event),
  };
}
