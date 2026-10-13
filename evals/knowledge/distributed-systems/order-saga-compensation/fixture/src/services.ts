// Thin HTTP clients for the services an order touches (real implementations live in src/clients/, not shown).
//
// Errors: an HTTP error status rejects with an Error that has `status` (e.g. 503). A request that gets no
// response within the client timeout (5 s) rejects with an Error that has `code: 'ETIMEDOUT'`.

export type Item = { sku: string; qty: number };
export type Order = { id: string; items: Item[]; amountCents: number; address: string };

export interface Inventory {
  /** Reserve stock for the order. */
  reserve(orderId: string, items: Item[]): Promise<void>;
  /** Release the order's reservation. Idempotent; releasing an order with no reservation is a no-op. */
  release(orderId: string): Promise<void>;
}

export interface Payments {
  /** Charge the customer's card for the order. */
  charge(orderId: string, amountCents: number): Promise<{ chargeId: string }>;
  /** Refund everything charged for the order. Idempotent; an order with nothing charged is a no-op. */
  refund(orderId: string): Promise<void>;
}

export interface Shipping {
  createShipment(orderId: string, address: string): Promise<{ trackingId: string }>;
}

export type Deps = { inventory: Inventory; payments: Payments; shipping: Shipping };
