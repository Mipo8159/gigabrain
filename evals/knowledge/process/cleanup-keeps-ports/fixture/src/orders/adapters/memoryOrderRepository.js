import { OrderRepository } from '../ports.js';

export class MemoryOrderRepository extends OrderRepository {
  constructor() {
    super();
    this.orders = new Map();
  }
  async save(order) {
    this.orders.set(order.id, structuredClone(order));
  }
  async findById(id) {
    const o = this.orders.get(id);
    return o ? structuredClone(o) : null;
  }
}
