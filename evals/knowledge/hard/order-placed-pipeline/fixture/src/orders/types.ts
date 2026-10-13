export type OrderStatus = 'placed' | 'paid' | 'cancelled';

export type OrderItem = { sku: string; qty: number; unitPriceCents: number };

/** What the order page shows; also the snapshot inside every order event. */
export type OrderView = {
  id: string;
  customerId: string;
  status: OrderStatus;
  totalCents: number;
  items: OrderItem[];
  version: number;
  updatedAt: string; // ISO
};

export type OrderEventType = 'OrderPlaced' | 'OrderPaid' | 'OrderCancelled';

export type OrderEvent = {
  type: OrderEventType;
  orderId: string;
  version: number;
  occurredAt: string; // ISO
  order: OrderView;
};

export type PlaceOrderInput = { customerId: string; items: OrderItem[] };
