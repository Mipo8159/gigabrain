import { Controller, Get, Param } from '@nestjs/common';
import { PricingService } from './pricing.service';

@Controller('prices')
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  @Get(':sku')
  price(@Param('sku') sku: string) {
    return { sku, price: this.pricing.quote(sku) };
  }
}
