export interface Order {
  id: string;
  customerId: string;
  createdAt: string;     // ISO 8601
  status: 'pending' | 'paid' | 'shipped' | 'cancelled';
  totalCents: number;
}

const orders: Order[] = [];

export const orderStore = {
  add(o: Order): void {
    orders.push({ ...o });
  },
  byCustomer(customerId: string): Order[] {
    return orders.filter((o) => o.customerId === customerId).map((o) => ({ ...o }));
  },
  clear(): void {
    orders.length = 0;
  },
};
