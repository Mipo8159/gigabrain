import type { Deps, Order } from './services.ts';

export async function placeOrder(order: Order, deps: Deps): Promise<'completed' | 'cancelled'> {
  await deps.inventory.reserve(order.id, order.items);
  await deps.payments.charge(order.id, order.amountCents);
  await deps.shipping.createShipment(order.id, order.address);
  return 'completed';
}
