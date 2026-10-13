import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { doc, ticketsTable } from './db.ts';

export type Ticket = { tenantId: string; ticketId: string; subject: string; status: 'OPEN' | 'CLOSED' };

const encodeCursor = (key: Record<string, unknown>) => Buffer.from(JSON.stringify(key)).toString('base64url');
const decodeCursor = (cursor: string) => JSON.parse(Buffer.from(cursor, 'base64url').toString());

export async function listOpenTickets(
  tenantId: string,
  opts: { limit: number; cursor?: string },
): Promise<{ items: Ticket[]; nextCursor?: string }> {
  const out = await doc.send(new QueryCommand({
    TableName: ticketsTable(),
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :ticket)',
    FilterExpression: '#status = :open',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':pk': `TENANT#${tenantId}`, ':ticket': 'TICKET#', ':open': 'OPEN' },
    Limit: opts.limit,
    ExclusiveStartKey: opts.cursor ? decodeCursor(opts.cursor) : undefined,
  }));

  const items: Ticket[] = (out.Items ?? []).map(it => ({
    tenantId,
    ticketId: it.ticketId,
    subject: it.subject,
    status: it.status,
  }));
  return { items, nextCursor: out.LastEvaluatedKey ? encodeCursor(out.LastEvaluatedKey) : undefined };
}
