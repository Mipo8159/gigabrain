import { IsBoolean, IsIn, IsOptional, Matches } from 'class-validator';

export class SalesReportQuery {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to!: string;

  @IsOptional()
  @IsIn(['day', 'sku'])
  groupBy?: 'day' | 'sku' = 'day';

  @IsOptional()
  @IsBoolean()
  includeRefunds?: boolean = false;
}
