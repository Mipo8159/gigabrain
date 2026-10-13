import { orderStore } from './store.ts';

export function customerSummary(customerId: string) {
  const orders = orderStore.byCustomer(customerId).filter((o) => o.status !== 'cancelled');
  return {
    orders: orders.length,
    spentCents: orders.reduce((s, o) => s + o.totalCents, 0),
    lastOrderAt: orders.map((o) => o.createdAt).sort().at(-1) ?? null,
  };
}
