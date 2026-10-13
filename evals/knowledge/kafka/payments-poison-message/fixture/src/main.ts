import { startPaymentsConsumer } from './consumer.ts';

const c = await startPaymentsConsumer({
  topic: 'billing.payments',
  groupId: 'ledger',
  dlqTopic: 'billing.payments.dlq',
  apply: async (p) => { console.log('apply', p.paymentId); },
});
process.once('SIGTERM', () => { void c.stop(); });
