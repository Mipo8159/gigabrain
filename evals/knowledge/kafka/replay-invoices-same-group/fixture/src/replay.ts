import { kafka } from './kafka.ts';
import type { Invoice } from './mailer.ts';

// TODO (see ticket)
export async function replayInvoices(opts: {
  topic: string;
  groupId: string;
  send: (inv: Invoice) => Promise<void>;
}): Promise<{ stop(): Promise<void> }> {
  void kafka;
  throw new Error('not implemented');
}
