import { startAuditConsumer } from './audit.ts';

const c = await startAuditConsumer({
  topic: 'audit.events',
  groupId: 'audit-archiver',
  onEvent: async (e) => { console.log(JSON.stringify(e)); },
});
process.once('SIGTERM', () => { void c.stop(); });
