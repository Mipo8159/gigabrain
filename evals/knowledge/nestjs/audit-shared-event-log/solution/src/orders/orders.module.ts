import { Module } from '@nestjs/common';
import { EventLogRoot } from '../events/event-log.root';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [EventLogRoot],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
