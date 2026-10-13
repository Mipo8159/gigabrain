import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { HealthController } from './health/health.controller';
import { OrdersModule } from './orders/orders.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [OrdersModule, AuditModule],
  controllers: [HealthController],
  providers: [{ provide: APP_PIPE, useValue: new ValidationPipe({ whitelist: true, transform: true }) }],
})
export class AppModule {}
