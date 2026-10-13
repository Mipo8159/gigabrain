import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { TICKET_STATUSES, TicketStatus } from './ticket';

export class TicketFilter {
  @IsOptional()
  @IsIn(TICKET_STATUSES)
  status?: TicketStatus;

  @IsOptional()
  @IsString()
  assignee?: string;
}

export class ListTicketsQuery {
  @IsOptional()
  @ValidateNested()
  @Type(() => TicketFilter)
  filter?: TicketFilter;
}
