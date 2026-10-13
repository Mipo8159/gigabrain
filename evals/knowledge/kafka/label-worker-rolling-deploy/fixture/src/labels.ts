import { appendFileSync } from 'node:fs';

export type Shipment = { shipmentId: string; carrier: string; delayMs?: number };

/**
 * Sends the label to the warehouse printer. Slow (the printer API takes up to a few seconds).
 * Every call prints a physical label, so printing the same shipment twice means two labels on the floor.
 * The audit trail goes to PRINT_LOG (one line per start/finish).
 */
export async function printLabel(s: Shipment): Promise<void> {
  const log = process.env.PRINT_LOG;
  if (log) appendFileSync(log, `start ${s.shipmentId} ${process.pid}\n`);
  await new Promise((r) => setTimeout(r, s.delayMs ?? 50));
  if (log) appendFileSync(log, `done ${s.shipmentId} ${process.pid}\n`);
}
