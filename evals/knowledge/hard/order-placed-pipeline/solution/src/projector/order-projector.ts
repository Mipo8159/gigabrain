import type { Kafka } from 'kafkajs';
import type { Redis } from '../readmodel/redis.ts';
import type { OrderEvent } from '../orders/types.ts';
import { storeViewIfNewer } from '../readmodel/view-store.ts';
import { log } from '../logger.ts';

/** Applies one order event to the Redis read model (never replaces a newer version). */
export async function applyOrderEvent(redis: Redis, event: OrderEvent): Promise<void> {
  await storeViewIfNewer(redis, { ...event.order, version: event.version });
}

export type ProjectorOptions = { kafka: Kafka; redis: Redis; topic: string; groupId: string };

/** Consumes order events into the read model. Resolves once the consumer is running. */
export async function startOrderProjector(opts: ProjectorOptions): Promise<{ stop(): Promise<void> }> {
  const consumer = opts.kafka.consumer({ groupId: opts.groupId });
  await consumer.connect();
  await consumer.subscribe({ topic: opts.topic, fromBeginning: true });
  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      let event: OrderEvent;
      try {
        event = JSON.parse(message.value.toString());
      } catch {
        log.warn('skipping unparsable order event', { offset: message.offset });
        return;
      }
      await applyOrderEvent(opts.redis, event);
    },
  });
  return { stop: () => consumer.disconnect() };
}
