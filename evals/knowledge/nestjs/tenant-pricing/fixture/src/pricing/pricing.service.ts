import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { RateTable, RateTableSource } from './rate-table.source';

@Injectable()
export class PricingService implements OnModuleInit {
  private table: RateTable;

  constructor(private readonly source: RateTableSource) {}

  async onModuleInit() {
    this.table = await this.source.load();
  }

  skus(): string[] {
    return Object.keys(this.table.prices);
  }

  quote(sku: string): number {
    const base = this.table.prices[sku];
    if (base === undefined) throw new NotFoundException(`Unknown SKU ${sku}`);
    return base;
  }
}
