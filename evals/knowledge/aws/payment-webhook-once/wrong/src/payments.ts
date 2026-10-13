import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { doc, paymentsTable } from './db.ts';

export type Payment = { paymentId: string; orderId: string; amountCents: number; currency: string };

export async function recordPayment(p: Payment): Promise<{ status: 'created' | 'duplicate'; payment: Payment }> {
  const table = paymentsTable();
  const payment: Payment = { paymentId: p.paymentId, orderId: p.orderId, amountCents: p.amountCents, currency: p.currency };

  const { Item } = await doc.send(new GetCommand({
    TableName: table,
    Key: { paymentId: payment.paymentId },
    ConsistentRead: true,
  }));
  if (Item) {
    const stored = Item as Payment;
    return {
      status: 'duplicate',
      payment: { paymentId: stored.paymentId, orderId: stored.orderId, amountCents: stored.amountCents, currency: stored.currency },
    };
  }

  await doc.send(new PutCommand({ TableName: table, Item: payment }));
  return { status: 'created', payment };
}
