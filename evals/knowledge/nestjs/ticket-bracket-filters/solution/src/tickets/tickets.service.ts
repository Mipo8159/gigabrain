import { Injectable } from '@nestjs/common';
import { Ticket } from './ticket';
import { TicketFilter } from './list-tickets.query';
import { TicketsRepository } from './tickets.repository';

@Injectable()
export class TicketsService {
  constructor(private readonly repo: TicketsRepository) {}

  list(filter: TicketFilter = {}): Ticket[] {
    return this.repo
      .all()
      .filter((t) => filter.status === undefined || t.status === filter.status)
      .filter((t) => filter.assignee === undefined || t.assignee === filter.assignee);
  }
}
