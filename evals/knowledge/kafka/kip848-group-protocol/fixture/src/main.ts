import { startShipmentConsumer } from './consumer.ts';

const c = await startShipmentConsumer({
  topic: 'logistics.shipment-updates',
  groupId: 'shipment-tracker',
  onUpdate: async (u) => { console.log(u.shipmentId, u.status); },
});
process.once('SIGTERM', () => { void c.stop(); });
