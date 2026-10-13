import { Module } from '@nestjs/common';
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
})
export class AppModule {}
