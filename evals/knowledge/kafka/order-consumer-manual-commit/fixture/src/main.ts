import { kafka } from './kafka.ts';
import { saveOrder } from './orders.ts';
import { startOrderConsumer } from './consumer.ts';

const consumer = kafka.consumer({ groupId: 'orders-svc' });
await consumer.connect();
await startOrderConsumer(consumer, 'orders.placed', saveOrder);
