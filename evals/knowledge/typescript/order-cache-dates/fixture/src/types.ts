export type OrderStatus = 'pending' | 'paid' | 'refunded';

export type OrderLine = { sku: string; qty: number; unitCents: number };

export type Order = {
  id: string;
  customerId: string;
  status: OrderStatus;
  totalCents: number;
  lines: OrderLine[];
  createdAt: Date;
  /** null until the payment is captured */
  paidAt: Date | null;
};

export interface OrderRepo {
  findById(id: string): Promise<Order | null>;
}
