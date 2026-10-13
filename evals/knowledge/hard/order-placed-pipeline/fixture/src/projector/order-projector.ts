import type { Kafka } from 'kafkajs';
import type { Redis } from '../readmodel/redis.ts';
import type { OrderEvent } from '../orders/types.ts';

/** Applies one order event to the Redis read model. */
export async function applyOrderEvent(redis: Redis, event: OrderEvent): Promise<void> {
  throw new Error('not implemented');
}

export type ProjectorOptions = { kafka: Kafka; redis: Redis; topic: string; groupId: string };

/** Consumes order events into the read model. Resolves once the consumer is running. */
export async function startOrderProjector(opts: ProjectorOptions): Promise<{ stop(): Promise<void> }> {
  throw new Error('not implemented');
}
