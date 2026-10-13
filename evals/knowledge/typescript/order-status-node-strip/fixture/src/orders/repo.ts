export type Order = {
  id: string;
  customerId: string;
  status: string;
  totalCents: number;
  updatedAt: Date;
};

export interface OrderRepo {
  get(id: string): Promise<Order | undefined>;
  save(order: Order): Promise<void>;
}

export function createMemoryOrderRepo(seed: Order[] = []): OrderRepo & { all(): Order[] } {
  const rows = new Map(seed.map(o => [o.id, { ...o }]));
  return {
    async get(id) {
      const o = rows.get(id);
      return o && { ...o };
    },
    async save(order) {
      rows.set(order.id, { ...order });
    },
    all: () => [...rows.values()],
  };
}
