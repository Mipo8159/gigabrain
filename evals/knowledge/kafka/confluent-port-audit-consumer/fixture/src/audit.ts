import { kafka } from './kafka.ts';

export type AuditEvent = { id: string; actor: string; action: string; at: string };

// TODO: port src/legacy/audit-kafkajs.ts to the Confluent client (see ticket).
export async function startAuditConsumer(opts: {
  topic: string;
  groupId: string;
  onEvent: (e: AuditEvent) => Promise<void>;
}): Promise<{ stop(): Promise<void> }> {
  void kafka;
  throw new Error('not implemented');
}
