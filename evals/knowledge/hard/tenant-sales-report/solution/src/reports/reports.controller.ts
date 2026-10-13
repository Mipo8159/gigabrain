import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TenantGuard } from '../tenants/tenant.guard';
import { TenantId } from '../tenants/tenant-id.decorator';
import { SalesReportQuery } from './dto/sales-report.query';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(TenantGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('sales')
  sales(@TenantId() tenantId: string, @Query() q: SalesReportQuery) {
    return this.reports.sales(tenantId, q);
  }
}
