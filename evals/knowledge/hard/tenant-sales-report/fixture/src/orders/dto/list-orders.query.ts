import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListOrdersQuery {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsIn(['paid', 'refunded', 'cancelled'])
  status?: 'paid' | 'refunded' | 'cancelled';
}
