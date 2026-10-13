import type { Clock } from '../clock.ts';
import type { Order, OrderRepo } from './repo.ts';
import { canTransition, isOrderStatus, type OrderStatus } from './status.ts';

export class InvalidTransitionError extends Error {
  readonly from: string;
  readonly to: string;
  constructor(from: string, to: string) {
    super(`cannot move order from ${from} to ${to}`);
    this.name = 'InvalidTransitionError';
    this.from = from;
    this.to = to;
  }
}

export class OrderNotFoundError extends Error {
  constructor(id: string) {
    super(`order ${id} not found`);
    this.name = 'OrderNotFoundError';
  }
}

export class OrderService {
  readonly #repo: OrderRepo;
  readonly #clock: Clock;

  constructor(repo: OrderRepo, clock: Clock) {
    this.#repo = repo;
    this.#clock = clock;
  }

  async transition(orderId: string, to: OrderStatus): Promise<Order> {
    const order = await this.#repo.get(orderId);
    if (!order) throw new OrderNotFoundError(orderId);
    if (!isOrderStatus(order.status) || !isOrderStatus(to) || !canTransition(order.status, to)) {
      throw new InvalidTransitionError(order.status, to);
    }
    const next: Order = { ...order, status: to, updatedAt: this.#clock.now() };
    await this.#repo.save(next);
    return next;
  }
}
