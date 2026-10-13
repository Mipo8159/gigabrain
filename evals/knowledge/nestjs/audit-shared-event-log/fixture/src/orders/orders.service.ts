import { Injectable, NotFoundException } from '@nestjs/common';
import { EventLog } from '../events/event-log';
import { CreateOrderDto } from './create-order.dto';

export interface Order extends CreateOrderDto {
  id: number;
  status: 'placed' | 'cancelled';
}

@Injectable()
export class OrdersService {
  private readonly orders = new Map<number, Order>();
  private nextId = 1;

  constructor(private readonly events: EventLog) {}

  create(dto: CreateOrderDto): Order {
    const order: Order = { id: this.nextId++, ...dto, status: 'placed' };
    this.orders.set(order.id, order);
    this.events.append('order.created', { orderId: order.id, sku: order.sku, qty: order.qty });
    return order;
  }

  cancel(id: number): Order {
    const order = this.orders.get(id);
    if (!order) throw new NotFoundException();
    order.status = 'cancelled';
    this.events.append('order.cancelled', { orderId: id });
    return order;
  }
}
