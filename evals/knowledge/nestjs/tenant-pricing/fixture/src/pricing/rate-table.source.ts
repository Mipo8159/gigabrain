import { Injectable } from '@nestjs/common';

export interface RateTable {
  /** Base price per SKU, in EUR. */
  prices: Record<string, number>;
  /** Price multiplier per tenant. */
  tenants: Record<string, number>;
}

/** Fetches the rate table from the pricing upstream (slow: several seconds in prod). */
@Injectable()
export class RateTableSource {
  async load(): Promise<RateTable> {
    return {
      prices: { 'SKU-A': 10, 'SKU-B': 2.5, 'SKU-C': 99.99 },
      tenants: { acme: 1, globex: 1.2, initech: 0.9 },
    };
  }
}
