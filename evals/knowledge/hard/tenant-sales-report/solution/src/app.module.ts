import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { TenantsModule } from './tenants/tenants.module';
import { OrdersModule } from './orders/orders.module';
import { ProductsModule } from './products/products.module';
import { ReportsModule } from './reports/reports.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [DatabaseModule, RedisModule, TenantsModule, OrdersModule, ProductsModule, ReportsModule],
  controllers: [HealthController],
  providers: [
    // Registered in the module (not only in main.ts) so tests that boot AppModule validate too.
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }),
    },
  ],
})
export class AppModule {}
