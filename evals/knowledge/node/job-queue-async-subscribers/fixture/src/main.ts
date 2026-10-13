import { JobQueue } from './queue.ts';
import { registerEmailConsumer } from './consumers/email.ts';

const queue = new JobQueue();
queue.on('error', (err) => console.error('[job failed]', err));
registerEmailConsumer(queue);

queue.enqueue({ id: '1', type: 'email', payload: { to: 'a@example.com', template: 'welcome' } });
queue.enqueue({ id: '2', type: 'email', payload: { to: 'broken', template: 'welcome' } });
queue.enqueue({ id: '3', type: 'email', payload: { to: 'c@example.com', template: 'welcome' } });
