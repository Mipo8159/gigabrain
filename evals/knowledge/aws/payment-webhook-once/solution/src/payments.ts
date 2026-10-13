import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { doc, paymentsTable } from './db.ts';

export type Payment = { paymentId: string; orderId: string; amountCents: number; currency: string };

export async function recordPayment(p: Payment): Promise<{ status: 'created' | 'duplicate'; payment: Payment }> {
  const payment: Payment = { paymentId: p.paymentId, orderId: p.orderId, amountCents: p.amountCents, currency: p.currency };
  try {
    // One conditional write decides the race; on conflict DynamoDB hands back the stored item.
    await doc.send(new PutCommand({
      TableName: paymentsTable(),
      Item: payment,
      ConditionExpression: 'attribute_not_exists(paymentId)',
      ReturnValuesOnConditionCheckFailure: 'ALL_OLD',
    }));
    return { status: 'created', payment };
  } catch (err) {
    if (!(err instanceof ConditionalCheckFailedException) || !err.Item) throw err;
    // err.Item is raw AttributeValue JSON even through the DocumentClient.
    const s = unmarshall(err.Item) as Payment;
    return { status: 'duplicate', payment: { paymentId: s.paymentId, orderId: s.orderId, amountCents: s.amountCents, currency: s.currency } };
  }
}
