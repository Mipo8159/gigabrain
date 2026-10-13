import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { RateTableSource } from './rate-table.source';
import { TenantContext } from './tenant-context';
import { TenantMiddleware } from './tenant.middleware';

@Module({
  controllers: [PricingController],
  providers: [PricingService, RateTableSource, TenantContext],
  exports: [PricingService, TenantContext],
})
export class PricingModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('prices', 'cart');
  }
}
