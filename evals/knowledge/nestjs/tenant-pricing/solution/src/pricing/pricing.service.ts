import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { RateTable, RateTableSource } from './rate-table.source';
import { TenantContext } from './tenant-context';

@Injectable()
export class PricingService implements OnModuleInit {
  private table: RateTable;

  constructor(
    private readonly source: RateTableSource,
    private readonly tenantContext: TenantContext,
  ) {}

  async onModuleInit() {
    this.table = await this.source.load();
  }

  skus(): string[] {
    return Object.keys(this.table.prices);
  }

  /** Price for the given tenant, or the current request's tenant. */
  quote(sku: string, tenant = this.tenantContext.current()): number {
    if (!tenant) throw new BadRequestException('X-Tenant header is required');
    const multiplier = this.table.tenants[tenant];
    if (multiplier === undefined) throw new BadRequestException(`Unknown tenant ${tenant}`);
    const base = this.table.prices[sku];
    if (base === undefined) throw new NotFoundException(`Unknown SKU ${sku}`);
    return Math.round(base * multiplier * 100) / 100;
  }
}
