import { Injectable } from '@nestjs/common';
import { PricingService } from '../pricing/pricing.service';

@Injectable()
export class CartService {
  constructor(private readonly pricing: PricingService) {}

  total(skus: string[]): number {
    const cents = skus.reduce((sum, sku) => sum + Math.round(this.pricing.quote(sku) * 100), 0);
    return cents / 100;
  }
}
