// "Simplified": the port indirection is gone; storage lives in the service.
import { randomUUID } from 'node:crypto';

export class OrderService {
  constructor() {
    this.orders = new Map();
  }

  async placeOrder(customer, lines) {
    if (!Array.isArray(lines) || lines.length === 0) throw new Error('order needs at least one line');
    for (const l of lines) if (!Number.isInteger(l.qty) || l.qty <= 0) throw new Error(`bad qty for ${l.sku}`);
    const total = lines.reduce((s, l) => s + l.priceCents * l.qty, 0);
    const order = { id: randomUUID(), customer, lines, total, status: 'placed' };
    this.orders.set(order.id, order);
    console.log(`[orders] order ${order.id} placed`);
    return order;
  }

  async getOrder(id) {
    const order = this.orders.get(id);
    if (!order) throw new Error(`order ${id} not found`);
    return order;
  }
}
