import { BadRequestException, Body, Controller, Get, ParseArrayPipe, Post } from '@nestjs/common';
import { CreateOrderDto } from './create-order.dto';
import { OrdersService } from './orders.service';

const MAX_BULK = 500;

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  findAll() {
    return this.orders.findAll();
  }

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.orders.create(dto);
  }

  // `CreateOrderDto[]` is erased at runtime, so the global ValidationPipe can't see the item type:
  // ParseArrayPipe validates every item (and rejects non-arrays) before anything is stored.
  @Post('bulk')
  createMany(@Body(new ParseArrayPipe({ items: CreateOrderDto, whitelist: true })) dtos: CreateOrderDto[]) {
    if (dtos.length < 1 || dtos.length > MAX_BULK) {
      throw new BadRequestException(`Send between 1 and ${MAX_BULK} orders`);
    }
    return dtos.map((dto) => this.orders.create(dto));
  }
}
