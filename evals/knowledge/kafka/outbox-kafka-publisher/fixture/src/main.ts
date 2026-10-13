import { Kafka } from 'kafkajs';
import { relayTick, type Db } from './relay.ts';
import { createOutboxPublisher } from './publisher.ts';

/** Wired by the service bootstrap (pg Pool in production). */
export async function runRelay(db: Db): Promise<never> {
  const kafka = new Kafka({ clientId: 'orders-outbox-relay', brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',') });
  const publisher = await createOutboxPublisher(kafka);
  for (;;) {
    try {
      await relayTick(db, publisher);
    } catch (e) {
      console.error('relay tick failed', e);
    }
    await new Promise((r) => setTimeout(r, 200));
  }
}
