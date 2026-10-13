import { Controller, Get, Query } from '@nestjs/common';
import { ListTicketsQuery } from './list-tickets.query';
import { TicketsService } from './tickets.service';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get()
  list(@Query() query: ListTicketsQuery) {
    return this.tickets.list(query.filter);
  }
}
