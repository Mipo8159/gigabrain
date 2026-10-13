import { Module } from '@nestjs/common';
import { CartModule } from './cart/cart.module';
import { HealthController } from './health/health.controller';
import { PricingModule } from './pricing/pricing.module';

@Module({
  imports: [PricingModule, CartModule],
  controllers: [HealthController],
})
export class AppModule {}
