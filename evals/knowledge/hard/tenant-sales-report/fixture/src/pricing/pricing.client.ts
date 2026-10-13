import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, AppConfig } from '../config';
import { PricingHttpError } from './pricing-http.error';

/**
 * Pricing service: GET /prices/:sku -> 200 { sku, listPriceCents } | 404 (SKU discontinued / not priced).
 * Throws PricingHttpError for any non-2xx answer; network errors and aborts propagate as is.
 */
@Injectable()
export class PricingClient {
  constructor(@Inject(APP_CONFIG) private readonly cfg: AppConfig) {}

  async getListPrice(sku: string, signal?: AbortSignal): Promise<number> {
    const res = await fetch(`${this.cfg.pricingUrl}/prices/${encodeURIComponent(sku)}`, { signal });
    if (!res.ok) {
      await res.body?.cancel();
      throw new PricingHttpError(res.status, sku);
    }
    const body = (await res.json()) as { listPriceCents: number };
    return body.listPriceCents;
  }
}
