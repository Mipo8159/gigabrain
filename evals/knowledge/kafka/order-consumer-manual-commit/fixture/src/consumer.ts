import type { Consumer } from 'kafkajs';
import type { Order } from './orders.ts';

/**
 * Consume `topic` and persist every order with `save`.
 * TODO: implement (see ticket).
 */
export async function startOrderConsumer(
  consumer: Consumer,
  topic: string,
  save: (order: Order) => Promise<void>,
): Promise<void> {
  throw new Error('not implemented');
}
