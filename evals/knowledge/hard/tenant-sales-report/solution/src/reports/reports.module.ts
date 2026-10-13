import { Module } from '@nestjs/common';
import { PricingModule } from '../pricing/pricing.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportCache } from './report-cache';

@Module({ imports: [PricingModule], controllers: [ReportsController], providers: [ReportsService, ReportCache] })
export class ReportsModule {}
