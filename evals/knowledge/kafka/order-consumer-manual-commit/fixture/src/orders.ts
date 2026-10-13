export type Order = { id: string; customerId: string; totalCents: number };

// Real implementation writes to Postgres; kept trivial here.
const saved = new Map<string, Order>();
export async function saveOrder(order: Order): Promise<void> {
  saved.set(order.id, order);
}
