import { HttpError } from '../http/errors.ts';
import type { PlaceOrderInput, OrderItem } from './types.ts';

const isInt = (v: unknown, min: number) => typeof v === 'number' && Number.isSafeInteger(v) && v >= min;

/** Validates a POST /orders body. Throws HttpError(400) with the offending fields. */
export function parsePlaceOrder(body: unknown): PlaceOrderInput {
  const errors: string[] = [];
  const b = (body ?? {}) as Record<string, unknown>;
  if (typeof b.customerId !== 'string' || !b.customerId) errors.push('customerId');
  const items: OrderItem[] = [];
  if (!Array.isArray(b.items) || b.items.length === 0 || b.items.length > 100) {
    errors.push('items');
  } else {
    b.items.forEach((raw, i) => {
      const it = (raw ?? {}) as Record<string, unknown>;
      if (typeof it.sku !== 'string' || !/^[A-Z0-9-]{1,40}$/.test(it.sku)) errors.push(`items[${i}].sku`);
      if (!isInt(it.qty, 1)) errors.push(`items[${i}].qty`);
      if (!isInt(it.unitPriceCents, 0)) errors.push(`items[${i}].unitPriceCents`);
      items.push({ sku: it.sku as string, qty: it.qty as number, unitPriceCents: it.unitPriceCents as number });
    });
  }
  if (errors.length) throw new HttpError(400, 'invalid order', { fields: errors });
  return { customerId: b.customerId as string, items };
}
