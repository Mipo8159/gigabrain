import { Controller, Get, NotFoundException, Param, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { TenantGuard } from '../tenants/tenant.guard';
import { PricingClient } from '../pricing/pricing.client';
import { PricingHttpError } from '../pricing/pricing-http.error';

@Controller('products')
@UseGuards(TenantGuard)
export class ProductsController {
  constructor(private readonly pricing: PricingClient) {}

  @Get(':sku/price')
  async price(@Param('sku') sku: string) {
    try {
      return { sku, listPriceCents: await this.pricing.getListPrice(sku, AbortSignal.timeout(2000)) };
    } catch (e) {
      if (e instanceof PricingHttpError && e.status === 404) throw new NotFoundException('not priced');
      throw new ServiceUnavailableException('pricing unavailable');
    }
  }
}
