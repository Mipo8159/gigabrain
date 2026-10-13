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
  throw new Error('not implemented');
}

export async function getOrderResponse(orderId: string): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
  throw new Error('not implemented');
}
