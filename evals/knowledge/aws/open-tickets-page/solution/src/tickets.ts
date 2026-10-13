import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { doc, ticketsTable } from './db.ts';

export type Ticket = { tenantId: string; ticketId: string; subject: string; status: 'OPEN' | 'CLOSED' };

const encode = (k: Record<string, unknown>) => Buffer.from(JSON.stringify(k)).toString('base64url');
const decode = (c: string) => JSON.parse(Buffer.from(c, 'base64url').toString());

export async function listOpenTickets(
  tenantId: string,
  opts: { limit: number; cursor?: string },
): Promise<{ items: Ticket[]; nextCursor?: string }> {
  const pk = `TENANT#${tenantId}`;
  const items: Ticket[] = [];
  let lastSk: string | undefined;
  let start: Record<string, unknown> | undefined = opts.cursor ? decode(opts.cursor) : undefined;
  // Limit counts items *evaluated* before the filter, and pages stop at 1 MB, so a page can be empty
  // and still not be the end. Keep reading until we have `limit` matches or there is no LastEvaluatedKey.
  while (items.length < opts.limit) {
    const page = await doc.send(new QueryCommand({
      TableName: ticketsTable(),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :t)',
      FilterExpression: '#s = :open',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':pk': pk, ':t': 'TICKET#', ':open': 'OPEN' },
      ExclusiveStartKey: start,
    }));
    for (const it of page.Items ?? []) {
      if (items.length === opts.limit) break;
      items.push({ tenantId, ticketId: it.ticketId, subject: it.subject, status: it.status });
      lastSk = it.sk;
    }
    if (items.length === opts.limit) break;
    start = page.LastEvaluatedKey;
    if (!start) return { items };
  }
  // Resume after the last item we returned, not after the last item DynamoDB evaluated.
  return { items, nextCursor: encode({ pk, sk: lastSk }) };
}
