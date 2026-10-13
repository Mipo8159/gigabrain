import { Injectable } from '@nestjs/common';
import { CreateOrderDto } from './create-order.dto';

export interface Order extends CreateOrderDto {
  id: number;
}

@Injectable()
export class OrdersService {
  private readonly orders: Order[] = [];
  private nextId = 1;

  findAll(): Order[] {
    return [...this.orders];
  }

  create(dto: CreateOrderDto): Order {
    const order: Order = { id: this.nextId++, ...dto };
    this.orders.push(order);
    return order;
  }
}
