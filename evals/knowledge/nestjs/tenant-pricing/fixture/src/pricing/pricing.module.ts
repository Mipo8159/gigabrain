import { Module } from '@nestjs/common';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { RateTableSource } from './rate-table.source';

@Module({
  controllers: [PricingController],
  providers: [PricingService, RateTableSource],
  exports: [PricingService],
})
export class PricingModule {}
