import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { doc, ordersTable } from './db.ts';

export type PartnerOrder = {
  orderId: string;
  partnerOrderNo: number | bigint; // the partner's int64 order number
  status: 'NEW' | 'SHIPPED';
  lines: { sku: string; qty: number; note?: string }[];
  shipping: { method: string; instructions?: string };
  raw: Record<string, unknown>; // the partner's original payload, kept for support
};

export async function saveOrder(order: PartnerOrder): Promise<void> {
  await doc.send(new PutCommand({ TableName: ordersTable(), Item: order }));
}

// The DocumentClient hands back large integers as bigint, which JSON.stringify can't handle.
const jsonReplacer = (_key: string, value: unknown) => (typeof value === 'bigint' ? Number(value) : value);

export async function getOrderResponse(orderId: string): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
  const headers = { 'content-type': 'application/json' };
  const { Item } = await doc.send(new GetCommand({ TableName: ordersTable(), Key: { orderId } }));
  if (!Item) return { statusCode: 404, headers, body: JSON.stringify({ message: 'not found' }) };

  const body = {
    orderId: Item.orderId,
    partnerOrderNo: String(Item.partnerOrderNo),
    status: Item.status,
    lines: Item.lines,
    shipping: Item.shipping,
    raw: Item.raw,
  };
  return { statusCode: 200, headers, body: JSON.stringify(body, jsonReplacer) };
}
