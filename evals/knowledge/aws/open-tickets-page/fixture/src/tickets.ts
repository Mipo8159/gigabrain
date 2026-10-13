import { doc, ticketsTable } from './db.ts';

export type Ticket = { tenantId: string; ticketId: string; subject: string; status: 'OPEN' | 'CLOSED' };

export async function listOpenTickets(
  tenantId: string,
  opts: { limit: number; cursor?: string },
): Promise<{ items: Ticket[]; nextCursor?: string }> {
  throw new Error('not implemented');
}
