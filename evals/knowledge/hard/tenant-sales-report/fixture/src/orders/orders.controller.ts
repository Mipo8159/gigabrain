import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TenantGuard } from '../tenants/tenant.guard';
import { TenantId } from '../tenants/tenant-id.decorator';
import { ListOrdersQuery } from './dto/list-orders.query';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(TenantGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(@TenantId() tenantId: string, @Query() q: ListOrdersQuery) {
    return this.orders.list(tenantId, q);
  }
}
