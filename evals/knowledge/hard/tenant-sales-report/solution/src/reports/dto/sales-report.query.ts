import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, Matches } from 'class-validator';

// Query strings: "false" must stay false (implicit conversion would make Boolean("false") === true).
const toBool = ({ obj, key }: { obj: Record<string, unknown>; key: string }) => {
  const raw = obj[key];
  if (raw === undefined) return undefined;
  if (raw === true || raw === 'true') return true;
  if (raw === false || raw === 'false') return false;
  return raw;
};

export class SalesReportQuery {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to!: string;

  @IsOptional()
  @IsIn(['day', 'sku'])
  groupBy?: 'day' | 'sku' = 'day';

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  includeRefunds?: boolean = false;
}
