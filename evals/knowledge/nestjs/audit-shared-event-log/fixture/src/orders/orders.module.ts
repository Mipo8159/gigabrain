import { Module } from '@nestjs/common';
import { EventLogModule } from '../events/event-log.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [EventLogModule.forRoot({ capacity: 1000 })],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
